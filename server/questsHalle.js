export const HALLE_QUESTS = {
  halle_1: {
    id: 'halle_1',
    name: 'Überfällige Fracht',
    level: 28,
    giverNpc: 'karawanenfuehrerin',
    turnInNpc: 'karawanenfuehrerin',
    requires: null,
    offerText:
      'Ich bin Isolde. Früher sind meine Wagen jede Woche zur alten Industriehalle im Nordwesten gefahren, Ersatzteile holen, Fracht abliefern. Dann kam eine Kolonne nicht zurück, und seitdem hat sich dort jeder eingenistet, der eine Waffe halten kann. Ich will wissen, ob in der Lagerhalle noch etwas steht, das den Weg wert ist. Geh hinein, bis in den Lagerbereich, und sorg dafür, dass die Wegelagerer dort lernen, dass sie nicht allein sind.',
    progressText: 'Die Halle liegt im Nordwesten der Siedlung. Der Lagerbereich ist gleich hinter dem Tor, aber unterschätz die Leute dort nicht.',
    completeText:
      'Regale bis unter die Decke, sagst du? Und niemand, der sie leer geräumt hat? Das gefällt mir nicht. Entweder haben die Leute dort Angst vor etwas, oder sie haben auf etwas gewartet. Hier, für deine Mühe. Schau dir die Halle weiter an, ich bezahle gut.',
    objectives: [
      { type: 'reach', zone: 'industriehalle', x: 0, z: 44, radius: 14, count: 1, label: 'Den Lagerbereich der Industriehalle erreichen' },
      { type: 'kill', enemyType: 'highwayman', count: 6, label: 'Wegelagerer in der Halle besiegt' },
    ],
    rewards: { xp: 3200, gold: 480, items: [{ itemId: 'medkit', quantity: 3 }] },
  },
  halle_2: {
    id: 'halle_2',
    name: 'Zwischen den Zeilen',
    level: 32,
    giverNpc: 'karawanenfuehrerin',
    turnInNpc: 'karawanenfuehrerin',
    requires: 'halle_1',
    offerText:
      'Eine Halle, in der noch alles steht, und keiner, der danach greift. Ich glaube nicht an Zufälle, aber ich glaube auch nicht gern an Geheimnisse. Ganz hinten gibt es die Verwaltung und ein Archiv. In Archiven steht, was jemand aufschreiben wollte, und manchmal auch, was er nicht aufschreiben wollte. Sieh dir an, was dort liegt. Nimm nichts mit, was dir nicht gehört, lies nur. Und lass dich nicht von dem aufhalten, der dort hinten das Sagen hat.',
    progressText: 'Das Archiv liegt im Verwaltungstrakt ganz im Norden der Halle. Die Flure sind eng, die Wachen dort sind besser als die im Lager.',
    completeText:
      'Papier lügt, Papier irrt, Papier wird gefälscht. Vielleicht ist das alles nur Schlamperei, wie sie in jedem Betrieb vorkommt. Vielleicht auch nicht. Ich lege mich nicht fest, und du solltest es auch nicht tun. Behalte, was du gelesen hast, und erzähl es nicht jedem. Die Beutelrolle hier hat einem Monteur gehört, jetzt gehört sie dir.',
    objectives: [
      { type: 'reach', zone: 'industriehalle', x: 22, z: -61, radius: 9, count: 1, label: 'Das Archiv der Industriehalle erreichen' },
      {
        type: 'inspect',
        ref: 'halle_lieferschein',
        count: 1,
        label: 'Lieferschein im Archiv untersuchen',
        text: 'Ein Stapel Lieferscheine, mit Büroklammern gebündelt. Die letzten Blätter sind abgestempelt und quittiert: „Empfänger: Zentralverwaltung, Sektor 7“. Eine Unterschrift fehlt auf jedem davon. Auf dem obersten Blatt hat jemand mit Bleistift an den Rand geschrieben: „Wieder abgeholt? Von wem?“',
      },
      {
        type: 'inspect',
        ref: 'halle_schichtbuch',
        count: 1,
        label: 'Schichtbuch im Archiv untersuchen',
        text: 'Ein Schichtbuch, die Einträge sauber in Blockschrift. Die letzte Schicht trägt zwei Daten: eins in der Kopfzeile, ein anderes im Stempel am Seitenrand, dazwischen liegen mehrere Tage. Darunter steht nur: „Anwesenheit vollständig. Betrieb wie angewiesen fortgeführt.“ Keine Namen.',
      },
      {
        type: 'inspect',
        ref: 'halle_rationsliste',
        count: 1,
        label: 'Rationsliste im Archiv untersuchen',
        text: 'Eine Ausgabeliste für Verpflegung, wochenweise geführt. Für die letzte Woche stehen 212 Rationen verzeichnet, die Stempelkarten daneben zählen 140 Beschäftigte. Zwei Namen auf der Liste sind mehrfach durchgestrichen und dann doch wieder eingetragen worden.',
      },
    ],
    rewards: { xp: 4200, gold: 650, items: [{ itemId: 'bag_toolroll', quantity: 1 }] },
  },
  halle_3: {
    id: 'halle_3',
    name: 'Der Vorarbeiter',
    level: 35,
    giverNpc: 'karawanenfuehrerin',
    turnInNpc: 'karawanenfuehrerin',
    requires: 'halle_2',
    offerText:
      'In jedem Gespräch über die Halle fällt dasselbe Wort: der Vorarbeiter. Niemand weiß, wie er heißt, niemand will ihn gesehen haben, und doch sagen alle, dass dort jemand Dienst tut, als wäre nichts geschehen. Er sitzt im Chefbüro am Ende der Verwaltung. Ich schicke dich nicht, um ihn zu töten, sondern damit der Weg dorthin wieder frei ist. Er wird sich allerdings kaum bitten lassen, ihn zu räumen. Sei vorbereitet.',
    progressText: 'Das Chefbüro liegt am Ende der Verwaltung. Rechne mit seinen Wachen und nimm Verbandszeug für mehrere Kämpfe mit.',
    completeText:
      'Er hat bis zuletzt seinen Dienst getan, sagst du? Auf wessen Anweisung, wüsste ich gern. Aber das beantwortet heute niemand mehr. Die Halle gehört jetzt dir, soweit irgendjemandem etwas gehört. Nimm das hier, ein Frachtrucksack aus meinen eigenen Beständen. Und halt die Augen offen, wenn du das nächste Mal in der Nähe eines Archivs bist.',
    objectives: [
      { type: 'kill', enemyType: 'foreman', count: 1, label: 'Den Vorarbeiter besiegt' },
    ],
    rewards: { xp: 5600, gold: 900, items: [{ itemId: 'bag_cargo', quantity: 1 }] },
  },
};
