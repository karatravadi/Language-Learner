/* Chapter content. Spanish from Spain, CEFR A1 → A2.
   Tokens in strings: {name} = learner's name, {o} = a/o ending from the learner's settings.
   To add a chapter, copy the shape of chapter 1 and move it from ROADMAP into CHAPTERS. */
window.CHAPTERS = [
  {
    id: 1, emoji: '🧭', title: 'Who you are & where you are', sub: 'Ser vs estar',
    can: "Introduce yourself, say where you're from, what you do and how you feel.", mins: 12,

    discover: {
      intro: 'Spanish has two verbs that both mean "to be". Before I explain anything, can you crack the code?',
      ser: [['Soy de Inglaterra.', "I'm from England."], ['Mi hermana es médica.', 'My sister is a doctor.'], ['Somos amigos.', 'We are friends.'], ['La paella es deliciosa.', 'Paella is delicious.']],
      estar: [['Estoy en Madrid.', "I'm in Madrid."], ['Estoy cansada.', "I'm tired."], ['Estamos viajando.', "We're travelling."], ['La sopa está fría.', 'The soup is cold.']],
      question: 'What do the blue sentences have in common, compared with the orange ones?',
      options: [
        'Blue = what someone or something IS (identity, origin, job). Orange = where it is, or how it is right now.',
        'Blue = past tense. Orange = present tense.',
        'Blue = formal Spanish. Orange = informal Spanish.'
      ],
      answer: 0,
      reveal: 'Yes! SER is for what something is. ESTAR is for where it is and how it is right now. Two memory hooks make it stick:'
    },
    doctor: [
      ['D', 'Description', 'Mi hermana es alta.', 'My sister is tall.'],
      ['O', 'Occupation', 'Es médica.', "She's a doctor."],
      ['C', 'Characteristic', 'Es simpática.', "She's nice."],
      ['T', 'Time / date', 'Hoy es lunes.', "Today's Monday."],
      ['O', 'Origin', 'Es de Londres.', "She's from London."],
      ['R', 'Relationship', 'Es mi amiga.', "She's my friend."]
    ],
    place: [
      ['P', 'Position', 'Está sentada.', "She's sitting."],
      ['L', 'Location', 'Está en Madrid.', "She's in Madrid."],
      ['A', 'Action (right now)', 'Está viajando.', "She's travelling."],
      ['C', 'Condition', 'Está cansada.', "She's tired."],
      ['E', 'Emotion', 'Está contenta.', "She's happy."]
    ],

    learn: {
      ser: [['yo', 'soy'], ['tú', 'eres'], ['él / ella / usted', 'es'], ['nosotros/as', 'somos'], ['vosotros/as', 'sois'], ['ellos / ellas / ustedes', 'son']],
      estar: [['yo', 'estoy'], ['tú', 'estás'], ['él / ella / usted', 'está'], ['nosotros/as', 'estamos'], ['vosotros/as', 'estáis'], ['ellos / ellas / ustedes', 'están']],
      spain: 'In Spain you will hear vosotros (informal "you all") constantly, so it is in the tables from day one.',
      twist: {
        title: 'Plot twist: same word, different meaning',
        a: ['La película es aburrida.', 'The film is boring.'],
        b: ['Estoy aburrid{o}.', "I'm bored."],
        note: 'With ser you describe what something is like. With estar you describe how it is or how you feel right now. (Handy: you can now say whether something is boring, or whether you are!)'
      },
      tener: 'Careful: sleepy, hungry, thirsty and age use TENER, not ser or estar. Tengo sueño. Tengo hambre. Tengo treinta años.'
    },

    phrases: [
      { id: 'c1-name', es: '¿Cómo te llamas?', en: "What's your name?", alts: [] },
      { id: 'c1-from', es: '¿De dónde eres?', en: 'Where are you from?', alts: [] },
      { id: 'c1-england', es: 'Soy de Inglaterra.', en: "I'm from England.", alts: [] },
      { id: 'c1-travel', es: 'Estoy de viaje.', en: "I'm travelling / I'm on a trip.", alts: [] },
      { id: 'c1-tired', es: 'Estoy cansado.', en: "I'm tired.", alts: ['Estoy cansada.'] },
      { id: 'c1-nice', es: 'Mucho gusto.', en: 'Nice to meet you.', alts: ['Encantado.', 'Encantada.'] },
      { id: 'c1-how', es: '¿Cómo estás?', en: 'How are you?', alts: [] },
      { id: 'c1-loo', es: '¿Dónde está el baño?', en: 'Where is the bathroom?', alts: ['¿Dónde están los aseos?', '¿Dónde está el servicio?'] }
    ],

    exercises: [
      { type: 'mc', skill: 'ser-id', q: '___ de Inglaterra.', options: ['Soy', 'Estoy', 'Es'], answer: 0, why: 'Where you are FROM is origin (the O in DOCTOR), so ser. With yo: soy.' },
      { type: 'listen', skill: 'phrases', say: 'Estoy cansada.', options: ["I'm tired.", "I'm from Spain.", "I'm a doctor."], answer: 0, why: '"Estoy cansada": estar for how you feel right now.' },
      { type: 'gap', skill: 'conj-estar', q: 'Nosotros ___ en Madrid.', hint: 'estar', answer: ['estamos'], why: 'Location means estar (the L in PLACE). Nosotros: estamos.' },
      { type: 'order', skill: 'ser-id', prompt: 'My parents are from London.', words: ['Mis', 'padres', 'son', 'de', 'Londres'], answer: 'Mis padres son de Londres.', why: 'Origin means ser, and "padres" is plural: son.' },
      { type: 'fix', skill: 'ser-id', prompt: 'Tap the word that is wrong.', sentence: 'Estoy de Inglaterra.', wrong: 0, fixed: 'Soy de Inglaterra.', why: 'Where you are FROM is origin, so ser. (Estoy de viaje is a different thing: "on a trip".)' },
      {
        type: 'rapid', skill: 'mixed', prompt: 'Rapid fire: ser or estar?', items: [
          { blank: '___ cansada.', full: 'Estoy cansada.', answer: 'estar', skill: 'estar-state', why: 'Tiredness is a condition: estar.' },
          { blank: '___ de Londres.', full: 'Soy de Londres.', answer: 'ser', skill: 'ser-id', why: 'Origin: ser.' },
          { blank: '___ viajando por Asia.', full: 'Estoy viajando por Asia.', answer: 'estar', skill: 'estar-state', why: 'An action happening now: estar.' },
          { blank: 'Ellos ___ mis amigos.', full: 'Ellos son mis amigos.', answer: 'ser', skill: 'ser-id', why: 'Relationship: ser.' },
          { blank: 'La cena ___ lista.', full: 'La cena está lista.', answer: 'estar', skill: 'estar-state', why: "Dinner's condition right now: estar." },
          { blank: 'Mi madre ___ profesora.', full: 'Mi madre es profesora.', answer: 'ser', skill: 'ser-id', why: 'Occupation: ser.' },
          { blank: 'Hoy ___ lunes.', full: 'Hoy es lunes.', answer: 'ser', skill: 'ser-id', why: 'Day or date: ser (the T in DOCTOR).' },
          { blank: '¿Dónde ___ el baño?', full: '¿Dónde está el baño?', answer: 'estar', skill: 'estar-loc', why: 'Location: estar.' }
        ]
      },
      { type: 'gap', skill: 'conj-ser', q: 'Tú ___ muy simpátic{o}.', hint: 'ser', answer: ['eres'], why: 'Personality is a characteristic: ser. Tú: eres.' },
      {
        type: 'match', skill: 'phrases', prompt: 'Match the Spanish with the English.', pairs: [
          ['Soy de…', "I'm from…"], ['Estoy cansado', "I'm tired"], ['¿Cómo te llamas?', "What's your name?"], ['Mucho gusto', 'Nice to meet you'], ['Estoy de viaje', "I'm on a trip"]
        ]
      },
      { type: 'translate', skill: 'estar-state', q: "I'm tired.", answer: ['estoy cansado', 'estoy cansada'], why: 'Condition: estar. (Cansado if you are male, cansada if female.)' },
      { type: 'mc', skill: 'twist', q: 'La película ___ aburrida.', sub: '(The film is boring.)', options: ['es', 'está'], answer: 0, why: 'What the film is LIKE: ser. Estar would mean it is boring you right now.' },
      { type: 'gap', skill: 'conj-estar', q: 'Vosotros ___ cansados.', hint: 'estar', answer: ['estáis'], why: 'Vosotros: estáis. Mind the accent!' },
      { type: 'fix', skill: 'ser-id', prompt: 'Tap the word that is wrong.', sentence: 'Mi hermano está médico.', wrong: 2, fixed: 'Mi hermano es médico.', why: 'A job is identity: ser.' },
      { type: 'translate', skill: 'conj-ser', q: 'We are from England.', answer: ['somos de inglaterra'], why: 'Origin: ser. Nosotros: somos.' },
      { type: 'order', skill: 'estar-state', prompt: "I'm on a trip around Asia.", words: ['Estoy', 'de', 'viaje', 'por', 'Asia'], answer: 'Estoy de viaje por Asia.', why: '"Estar de viaje" = to be on a trip. A temporary situation: estar.' },
      { type: 'translate', skill: 'twist', q: "I'm bored.", answer: ['estoy aburrido', 'estoy aburrida'], why: 'Bored is how you feel right now: estar. "Soy aburrido" would mean you are a boring person!' }
    ],

    write: {
      title: 'Your turn: say it in your own words',
      task: "Write 3 short sentences: where you're from, what you do, and where you are right now. Use ser and estar.",
      starter: 'Soy de…  Soy…  Estoy en…',
      model: 'Soy de Inglaterra. Soy profesora. Estoy de viaje en Madrid.',
      checklist: ['Origin and job use soy (ser)', 'Where you are now uses estoy (estar)', 'Each sentence starts with a capital and ends with a full stop']
    },

    boss: {
      title: 'Boss level: hostel check-in in Madrid',
      who: 'Lucía',
      scenario: 'hostel',
      turns: [
        { npc: '¡Hola, buenas tardes! ¿Cómo te llamas?', en: 'Hi, good afternoon! What\'s your name?',
          choices: [['Me llamo {name}.', true, ''], ['Soy llamo {name}.', false, '"Me llamo" is a fixed chunk: it literally means "I call myself".'], ['Estoy {name}.', false, 'Names use "me llamo" (or "soy {name}"), never estoy.']] },
        { npc: 'Mucho gusto, {name}. ¿De dónde eres?', en: 'Nice to meet you. Where are you from?',
          choices: [['Soy de Inglaterra.', true, ''], ['Estoy de Inglaterra.', false, 'Origin means ser: soy de.'], ['Es de Inglaterra.', false, 'Es = he/she/it is. You are talking about yourself: soy.']] },
        { npc: '¡Qué bien! ¿Estás de viaje o trabajas aquí?', en: 'Great! Are you on a trip or do you work here?',
          choices: [['Estoy de viaje.', true, ''], ['Soy de viaje.', false, '"On a trip" is a temporary situation: estoy de viaje.'], ['Estás de viaje.', false, 'Estás = you are. You are talking about yourself: estoy.']] },
        { npc: '¿Cómo estás? ¿Cansad{o} después del viaje?', en: 'How are you? Tired after the journey?',
          choices: [['Sí, estoy un poco cansad{o}.', true, ''], ['Sí, soy un poco cansad{o}.', false, 'Tiredness is a condition: estoy.'], ['Sí, está un poco cansad{o}.', false, '"Está" is he/she. You are talking about yourself: estoy.']] }
      ],
      closing: '¡Perfecto! Tu habitación es la doce. ¡Bienvenid{o}!',
      closingEn: 'Perfect! Your room is number twelve. Welcome!',
      chatOpening: '¿Necesitas algo más antes de subir a tu habitación?',
      chatOpeningEn: 'Do you need anything else before going up to your room?'
    }
  }
];

/* Chapters still to build, shown on the map so you can see where this is heading (A1 → A2). */
window.ROADMAP = [
  { n: 2, emoji: '🔤', title: 'Everyday verbs', can: 'Talk about what you do: hablar, comer, vivir in the present tense.' },
  { n: 3, emoji: '🔢', title: 'Numbers, time & dates', can: 'Say prices, ages, what time it is and when to meet.' },
  { n: 4, emoji: '🍽️', title: 'Food & ordering', can: 'Order from the menú del día, ask for la cuenta, handle allergies.' },
  { n: 5, emoji: '🚌', title: 'Getting around', can: 'Ask directions, buy tickets, understand "recto" and "a la izquierda".' },
  { n: 6, emoji: '🛏️', title: 'Hostels & shopping', can: 'Use hay and tener, ask for what you need, compare prices.' },
  { n: 7, emoji: '💬', title: 'Likes, wants & plans', can: 'Use gustar, querer, apetecer and ir a + infinitive.' },
  { n: 8, emoji: '⏰', title: 'Daily routine', can: 'Describe your day with reflexive verbs: levantarse, ducharse.' },
  { n: 9, emoji: '🧳', title: 'Irregular favourites', can: 'Master ir, hacer, tener, poder and querer.' },
  { n: 10, emoji: '⏪', title: 'What happened', can: 'Tell a short story with the pretérito perfecto (he perdido, he comido).' },
  { n: 11, emoji: '🧑‍🤝‍🧑', title: 'Describing people & places', can: 'Describe, compare and give opinions.' },
  { n: 12, emoji: '🎓', title: 'A2 checkpoint', can: 'A full conversation with a stranger, then your level check.' }
];
