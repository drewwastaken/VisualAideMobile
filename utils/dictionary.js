const OFFLINE_DICTIONARY = {
  adapt: { definition: 'To change something so it works better in a new situation.', synonyms: ['adjust', 'change'], phonetic: 'uh-DAPT' },
  adequate: { definition: 'Enough for what is needed.', synonyms: ['enough', 'sufficient'], phonetic: 'AD-uh-kwit' },
  alternative: { definition: 'Another choice or way of doing something.', synonyms: ['option', 'choice'], phonetic: 'awl-TER-nuh-tiv' },
  analyze: { definition: 'To study something carefully by looking at its parts.', synonyms: ['study', 'examine'], phonetic: 'AN-uh-lyze' },
  annual: { definition: 'Happening once every year.', synonyms: ['yearly'], phonetic: 'AN-yoo-uhl' },
  apparent: { definition: 'Easy to see or understand.', synonyms: ['clear', 'obvious'], phonetic: 'uh-PAIR-uhnt' },
  benefit: { definition: 'A helpful or good result.', synonyms: ['advantage', 'help'], phonetic: 'BEN-uh-fit' },
  concept: { definition: 'A general idea or thought.', synonyms: ['idea', 'notion'], phonetic: 'KON-sept' },
  conclude: { definition: 'To decide something after thinking about the facts.', synonyms: ['decide', 'finish'], phonetic: 'kun-KLOOD' },
  conduct: { definition: 'To organize or carry out an activity.', synonyms: ['do', 'manage'], phonetic: 'kun-DUKT' },
  consequence: { definition: 'Something that happens because of an action.', synonyms: ['result', 'effect'], phonetic: 'KON-suh-kwens' },
  considerable: { definition: 'Large or important enough to notice.', synonyms: ['significant', 'large'], phonetic: 'kun-SID-uh-ruh-buhl' },
  construct: { definition: 'To build or put something together.', synonyms: ['build', 'make'], phonetic: 'kun-STRUKT' },
  contribute: { definition: 'To give or add something to help a group or cause.', synonyms: ['give', 'add'], phonetic: 'kun-TRIB-yoot' },
  demonstrate: { definition: 'To show clearly how something works or is true.', synonyms: ['show', 'prove'], phonetic: 'DEM-un-strayt' },
  determine: { definition: 'To find out or make a decision.', synonyms: ['decide', 'discover'], phonetic: 'dih-TUR-min' },
  distribute: { definition: 'To share or deliver things to different people or places.', synonyms: ['share', 'deliver'], phonetic: 'dih-STRIB-yoot' },
  efficient: { definition: 'Working well without wasting time or effort.', synonyms: ['effective', 'productive'], phonetic: 'ih-FISH-uhnt' },
  establish: { definition: 'To start something that is meant to last.', synonyms: ['create', 'set up'], phonetic: 'ih-STAB-lish' },
  evaluate: { definition: 'To judge how good or useful something is.', synonyms: ['assess', 'judge'], phonetic: 'ih-VAL-yoo-ayt' },
  evidence: { definition: 'Facts or details that help show something is true.', synonyms: ['proof', 'clue'], phonetic: 'EV-uh-dens' },
  factor: { definition: 'One of the things that helps cause a result.', synonyms: ['cause', 'part'], phonetic: 'FAK-ter' },
  function: { definition: 'The job or purpose of something.', synonyms: ['role', 'purpose'], phonetic: 'FUNK-shun' },
  identify: { definition: 'To recognize or name someone or something.', synonyms: ['recognize', 'name'], phonetic: 'eye-DEN-tuh-fy' },
  indicate: { definition: 'To point out or show something.', synonyms: ['show', 'suggest'], phonetic: 'IN-dih-kayt' },
  individual: { definition: 'One person or thing, considered separately.', synonyms: ['person', 'single'], phonetic: 'in-duh-VIJ-oo-uhl' },
  interpret: { definition: 'To explain the meaning of something.', synonyms: ['explain', 'understand'], phonetic: 'in-TUR-prit' },
  method: { definition: 'A way of doing something.', synonyms: ['way', 'approach'], phonetic: 'METH-ud' },
  occur: { definition: 'To happen or take place.', synonyms: ['happen', 'take place'], phonetic: 'uh-KUR' },
  participate: { definition: 'To take part in an activity.', synonyms: ['join', 'take part'], phonetic: 'par-TIS-uh-payt' },
  percent: { definition: 'A part out of one hundred.', synonyms: ['portion', 'share'], phonetic: 'per-SENT' },
  period: { definition: 'A length or amount of time.', synonyms: ['time', 'duration'], phonetic: 'PEER-ee-ud' },
  policy: { definition: 'A rule or plan used by a group or organization.', synonyms: ['rule', 'plan'], phonetic: 'POL-uh-see' },
  potential: { definition: 'The chance that something may happen or develop.', synonyms: ['possibility', 'promise'], phonetic: 'puh-TEN-shuhl' },
  primary: { definition: 'Most important or coming first.', synonyms: ['main', 'chief'], phonetic: 'PRY-mare-ee' },
  proceed: { definition: 'To continue or move forward.', synonyms: ['continue', 'advance'], phonetic: 'pruh-SEED' },
  require: { definition: 'To need something or make it necessary.', synonyms: ['need', 'demand'], phonetic: 'rih-KWY-er' },
  respond: { definition: 'To answer or react to something.', synonyms: ['reply', 'react'], phonetic: 'rih-SPOND' },
  significant: { definition: 'Important or large enough to matter.', synonyms: ['important', 'meaningful'], phonetic: 'sig-NIF-ih-kunt' },
  similar: { definition: 'Almost the same, but not exactly the same.', synonyms: ['alike', 'related'], phonetic: 'SIM-uh-ler' },
  specific: { definition: 'Exact and clearly identified.', synonyms: ['particular', 'exact'], phonetic: 'spuh-SIF-ik' },
  structure: { definition: 'The way the parts of something are arranged.', synonyms: ['arrangement', 'organization'], phonetic: 'STRUK-cher' },
  theory: { definition: 'An explanation based on ideas and evidence.', synonyms: ['explanation', 'idea'], phonetic: 'THEER-ee' },
  transfer: { definition: 'To move something from one place or person to another.', synonyms: ['move', 'carry'], phonetic: 'trans-FUR' },
  vary: { definition: 'To change or be different.', synonyms: ['change', 'differ'], phonetic: 'VAIR-ee' },
};

function normalizeWord(value) {
  return value.toLocaleLowerCase('en').replace(/^[^a-z']+|[^a-z']+$/g, '');
}

export async function lookupWord(value) {
  const word = normalizeWord(value);
  if (!word) return null;

  const offlineEntry = OFFLINE_DICTIONARY[word];
  if (offlineEntry) return { word, ...offlineEntry, source: 'offline' };

  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Online dictionary returned ${response.status}.`);

  const entries = await response.json();
  const entry = entries[0];
  const meaning = entry?.meanings?.find((item) => item.definitions?.length);
  const definition = meaning?.definitions?.[0];
  if (!definition?.definition) return null;

  return {
    word,
    definition: definition.definition,
    synonyms: definition.synonyms?.length ? definition.synonyms : meaning.synonyms || [],
    phonetic: entry.phonetic || entry.phonetics?.find((item) => item.text)?.text || '',
    audio: entry.phonetics?.find((item) => item.audio)?.audio || '',
    source: 'online',
  };
}
