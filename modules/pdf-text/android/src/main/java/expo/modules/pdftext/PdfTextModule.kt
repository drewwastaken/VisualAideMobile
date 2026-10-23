package expo.modules.pdftext

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class PdfTextModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PdfText")

    AsyncFunction("extractText") { uri: String, promise: Promise ->
      val context = appContext.reactContext
        ?: return@AsyncFunction promise.reject("NO_CONTEXT", "React context unavailable", null)
      val descriptor = try {
        context.contentResolver.openFileDescriptor(Uri.parse(uri), "r")
      } catch (error: Exception) {
        promise.reject("PDF_OPEN_FAILED", error.localizedMessage ?: "Could not open the PDF.", error)
        return@AsyncFunction
      }
      if (descriptor == null) {
        promise.reject("PDF_OPEN_FAILED", "Could not open the selected PDF.", null)
        return@AsyncFunction
      }

      val renderer = try {
        PdfRenderer(descriptor)
      } catch (error: Exception) {
        descriptor.close()
        promise.reject("INVALID_PDF", error.localizedMessage ?: "This PDF could not be opened.", error)
        return@AsyncFunction
      }

      if (renderer.pageCount > MAX_PAGES) {
        val pageCount = renderer.pageCount
        renderer.close()
        descriptor.close()
        promise.reject(
          "PDF_TOO_LARGE",
          "This PDF has $pageCount pages. Please choose a PDF with $MAX_PAGES pages or fewer.",
          null
        )
        return@AsyncFunction
      }

      val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
      val executor: ExecutorService = Executors.newSingleThreadExecutor()
      val pageTexts = mutableListOf<String>()
      var pageIndex = 0

      fun closeResources() {
        recognizer.close()
        renderer.close()
        descriptor.close()
        executor.shutdown()
      }

      fun reject(error: Exception) {
        closeResources()
        promise.reject("PDF_RECOGNITION_FAILED", error.localizedMessage ?: "Could not read this PDF.", error)
      }

      lateinit var processNextPage: () -> Unit
      processNextPage = {
        if (pageIndex >= renderer.pageCount) {
          val fullText = pageTexts.mapIndexed { index, text ->
            if (text.isBlank()) "" else "Page ${index + 1}\n$text"
          }.filter { it.isNotBlank() }.joinToString("\n\n")
          closeResources()
          promise.resolve(mapOf("text" to fullText, "pageCount" to pageTexts.size))
        } else {
          var page: PdfRenderer.Page? = null
          var bitmap: Bitmap? = null
          try {
            page = renderer.openPage(pageIndex)
            val scale = minOf(3f, MAX_RENDER_EDGE.toFloat() / maxOf(page.width, page.height))
            val width = (page.width * scale).toInt().coerceAtLeast(1)
            val height = (page.height * scale).toInt().coerceAtLeast(1)
            bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            bitmap.eraseColor(Color.WHITE)
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
            val image = InputImage.fromBitmap(bitmap, 0)
            val renderedPage = page
            val renderedBitmap = bitmap
            recognizer.process(image)
              .addOnSuccessListener(executor) { result ->
                pageTexts.add(result.text)
                renderedPage.close()
                renderedBitmap.recycle()
                pageIndex += 1
                processNextPage()
              }
              .addOnFailureListener(executor) { error ->
                renderedPage.close()
                renderedBitmap.recycle()
                reject(error)
              }
          } catch (error: Exception) {
            page?.close()
            bitmap?.recycle()
            reject(error)
          }
        }
      }

      executor.execute { processNextPage() }
    }
  }

  private companion object {
    const val MAX_PAGES = 80
    const val MAX_RENDER_EDGE = 2400
  }
}
