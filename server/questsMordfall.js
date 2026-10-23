export const MORDFALL_QUESTS = {
  mord_1: {
    id: 'mord_1',
    name: 'Ein Bruder kommt nicht heim',
    level: 10,
    giverNpc: 'greta',
    turnInNpc: 'greta',
    requires: null,
    offerText:
      'Mein Bruder Jonas ist seit vier Tagen weg. Er wollte nur kurz zur alten Gärtnerei am westlichen Waldrand, Ersatzteile für den Wasserfilter suchen, und vor Einbruch der Dunkelheit zurück sein. Hier fragt niemand nach, jeder hat genug eigene Sorgen. Frag du für mich herum. Der Gastwirt kennt jeden, der abends durch seine Tür kommt, und der Allgemeinhändler weiß, wer was kauft.',
    progressText: 'Der Gastwirt und der Allgemeinhändler. Mehr verlange ich vorerst nicht.',
    completeText:
      'Seil und Taschenlampe, und Streit vor dem Stand. Und Kolja ist ihm hinterhergegangen. Danke. Das ist mehr, als ich in vier Tagen herausgefunden habe.',
    objectives: [
      {
        type: 'talk',
        npcId: 'gastwirt',
        count: 1,
        label: 'Mit dem Gastwirt sprechen',
        text: 'Jonas? Ja, der saß vor vier Tagen bis zum Abend bei mir. Trank nichts, sah öfter zur Tür. Er sagte, er müsse noch zur Gärtnerei im Westen. Kurz nach ihm ging Kolja raus, der Gehilfe vom Schrotthandel, ohne etwas bestellt zu haben. Mehr weiß ich nicht.',
      },
      {
        type: 'talk',
        npcId: 'allgemeinhaendler',
        count: 1,
        label: 'Mit dem Allgemeinhändler sprechen',
        text: 'Jonas hat bei mir ein Seil und eine Taschenlampe gekauft und gefragt, ob ich Batterien habe. Er wirkte nicht ängstlich, eher entschlossen. Vor meinem Stand hat er sich mit Hubert gestritten, worum es ging, habe ich nicht verstanden. Dann ist er in Richtung Westen gegangen.',
      },
    ],
    rewards: { xp: 380, gold: 60, items: [{ itemId: 'bandage', quantity: 2 }] },
  },
  mord_2: {
    id: 'mord_2',
    name: 'Blut im Gras',
    level: 10,
    giverNpc: 'greta',
    turnInNpc: 'greta',
    requires: 'mord_1',
    offerText:
      'Der Gastwirt hat ihn Richtung Gärtnerei gehen sehen. Ich schaffe es nicht, selbst dorthin zu gehen. Sieh am westlichen Waldrand nach, auf dem Weg vor der alten Gärtnerei. Wenn dort etwas ist, will ich wissen, was. Und pass auf die Hunde auf, die sich da herumtreiben.',
    progressText: 'Der westliche Waldrand, vor der alten Gärtnerei. Vorsicht vor den Hunden.',
    completeText:
      'Eine Schleifspur. Dann hat er den Wald nicht freiwillig betreten. ... Nein, sag nichts. Wenn du weitergehen kannst, folge ihr. Ich komme mit dem Warten nicht mehr zurecht.',
    objectives: [
      {
        type: 'inspect',
        ref: 'spur_wald',
        count: 1,
        label: 'Waldweg vor der Gärtnerei untersuchen',
        text: 'Das Gras auf dem Waldweg ist niedergetreten. Dunkle Flecken, längst getrocknet, und zwei tiefe Furchen, als sei etwas Schweres zwischen die Bäume gezogen worden. Die Spur führt tiefer in den Wald hinein.',
      },
      { type: 'kill', enemyType: 'feral_dog', count: 3, label: 'Wilde Hunde getötet' },
    ],
    rewards: { xp: 420, gold: 70, items: [{ itemId: 'canned_food', quantity: 2 }] },
  },
  mord_3: {
    id: 'mord_3',
    name: 'Was der Wald verbirgt',
    level: 11,
    giverNpc: 'greta',
    turnInNpc: 'greta',
    requires: 'mord_2',
    offerText:
      'Folge der Schleifspur. Ich weiß, was du dort finden könntest. Trotzdem bitte ich dich darum. Lieber weiß ich es, als dass ich mir jede Nacht etwas ausmale.',
    progressText: 'Die Schleifspur führt tiefer in den Wald. Folge ihr.',
    completeText:
      'Seine Jacke. Natürlich. Und das Notizbuch ... das ist seine Schrift. Ich danke dir, dass du es mir gesagt hast, und dass du es mir nicht schöner gemacht hast. Zwei Namen stehen darin. Die lasse ich nicht mehr los.',
    objectives: [
      {
        type: 'inspect',
        ref: 'leiche',
        count: 1,
        label: 'Fundort im Wald untersuchen',
        text: 'Zwischen den Wurzeln liegt ein Mann, halb unter Laub. Die Jacke passt zu Gretas Beschreibung. Der Hinterkopf ist eingeschlagen, nicht von einem Tier. Die Taschen sind nach außen gekehrt. Er liegt seit Tagen hier.',
      },
      {
        type: 'inspect',
        ref: 'tasche',
        count: 1,
        label: 'Notizbuch im Laub untersuchen',
        text: 'Ein Stück abseits liegt ein aufgerissenes Notizbuch im Laub, nass und halb zerfallen. Fast alles ist unleserlich. Zwei Zeilen sind noch zu entziffern: „K. schuldet mir noch 40, Montag nachfragen.“ Und weiter unten: „H. war wieder an meinem Beet. Das muss aufhören.“',
      },
    ],
    rewards: { xp: 520, gold: 80, items: [{ itemId: 'painkillers', quantity: 2 }] },
  },
  mord_4: {
    id: 'mord_4',
    name: 'Fragen, die niemand hören will',
    level: 11,
    giverNpc: 'greta',
    turnInNpc: 'greta',
    requires: 'mord_3',
    offerText:
      'K. und H. Kolja, dem Jonas Geld geliehen hat. Und Hubert, mit dem er sich seit dem Frühjahr um die Beete gestritten hat. Frag beide. Und frag den Apotheker, Jonas war bei ihm, kurz bevor er verschwand. Ich will wissen, wer lügt.',
    progressText: 'Kolja, Hubert und der Apotheker. Hör genau hin, was sie nicht sagen.',
    completeText:
      'Beide haben eine Ausrede, und beide klingen müde dabei. Ich kann es nicht unterscheiden. Aber Jonas hat sich an einem Zaun verletzt, kurz vorher? Dann sehen wir uns beide Verstecke an.',
    objectives: [
      {
        type: 'talk',
        npcId: 'kolja',
        count: 1,
        label: 'Mit Kolja sprechen',
        text: 'Ich war an dem Abend am Schrottplatz, fragt jeden. Ja, Jonas hat mir vierzig Gold geliehen. Na und? Wegen vierzig Gold tötet man niemanden. Lasst mich in Ruhe. Ich habe genug zu tun.',
      },
      {
        type: 'talk',
        npcId: 'hubert',
        count: 1,
        label: 'Mit Hubert sprechen',
        text: 'Jonas war ein Querulant. Stritt um jedes Beet, jede Gießkanne. Aber ich habe ihm nie ein Haar gekrümmt. Ich war an dem Abend zu Hause. Allein, ja. Seit wann braucht man Zeugen zum Schlafen?',
      },
      {
        type: 'talk',
        npcId: 'apotheker',
        count: 1,
        label: 'Mit dem Apotheker sprechen',
        text: 'Jonas war vor fünf Tagen hier. Hat Verbandszeug für eine Platzwunde am Handrücken gekauft. Er sagte, er habe sich an einem Gartenzaun verletzt. Der Zaun gehörte, glaube ich, seinem Nachbarn. Wen er damit meinte, hat er nicht gesagt.',
      },
    ],
    rewards: { xp: 560, gold: 90, items: [{ itemId: 'bandage', quantity: 3 }] },
  },
  mord_5: {
    id: 'mord_5',
    name: 'Was sie verstecken',
    level: 12,
    giverNpc: 'greta',
    turnInNpc: 'greta',
    requires: 'mord_4',
    offerText:
      'Kolja lagert hinter den Containern am Rand des Marktes, was er nicht zeigen will. Hubert hat einen Schuppen hinter seinem Beet. Sieh dir beides an, wenn du kannst. Ich weiß, was ich verlange.',
    progressText: 'Hinter den Containern am Marktrand, und im Schuppen hinter Huberts Beet.',
    completeText:
      'Er hat Jonas also gefunden und die Tasche genommen. Das macht ihn zum Dieb, nicht zum Mörder. Und Hubert hat einen Schraubenschlüssel geschliffen. Beides sind keine Beweise, nur Gründe. ... Gründe reichen, um ein Leben zu beenden. Das weiß ich inzwischen.',
    objectives: [
      {
        type: 'inspect',
        ref: 'kolja_versteck',
        count: 1,
        label: 'Koljas Versteck untersuchen',
        text: 'Hinter den Containern liegt unter einer Plane ein Rucksack. Seil, Taschenlampe, zwei leere Batterien. Das Geld fehlt. Dazwischen ein Zettel in Koljas Handschrift: „Hab ihn schon so gefunden. Hab Angst. Nehme die Tasche, bevor es jemand anderes tut.“',
      },
      {
        type: 'inspect',
        ref: 'hubert_schuppen',
        count: 1,
        label: 'Huberts Schuppen untersuchen',
        text: 'Im Schuppen hängt frisch gewaschene Arbeitskleidung. Auf der Werkbank liegt ein Schraubenschlüssel, der erst vor Kurzem blankgeschliffen wurde, im Gewinde haften dunkle Reste. An der Wand stapeln sich Beschwerden, alle von Jonas, alle abgestempelt mit „Beet Nr. 14“. So heißt Huberts Parzelle.',
      },
    ],
    rewards: { xp: 640, gold: 100, items: [{ itemId: 'medkit', quantity: 1 }] },
  },
  mord_6: {
    id: 'mord_6',
    name: 'Der Weg im Wald',
    level: 12,
    giverNpc: 'greta',
    turnInNpc: 'greta',
    requires: 'mord_5',
    offerText:
      'Im Wald war mehr als nur der Fundort. Jemand muss den Weg gegangen sein, ohne dass es jemand gesehen hat. Sieh dich noch einmal um, weiter südlich am Waldrand. Und frag den Barbier. Er sieht jedem auf die Schuhe, wenn er ihm den Nacken rasiert.',
    progressText: 'Weiter südlich am westlichen Waldrand. Und der Barbier hat ein Auge für Schuhe.',
    completeText:
      'Ein Spatengriff mit Beetnummer. Ein Stiefel mit Reifengummi. Ich glaube dir, wenn du sagst, dass es nicht Kolja war. Aber ich sehe auch, wie sehr du dir wünschst, dass ich entscheide. Das tue ich. Gleich. Lass mich nur einen Atemzug lang denken.',
    objectives: [
      {
        type: 'inspect',
        ref: 'stiefelspur',
        count: 1,
        label: 'Fußspuren am Waldrand untersuchen',
        text: 'Im weichen Boden zeichnen sich Abdrücke ab. Ein Stiefelprofil, aus dem Gummi eines Autoreifens geschnitten und aufgenäht, und ein schmaleres Paar, das davon weglief. Zwei Menschen, einer ging zurück, einer nicht.',
      },
      {
        type: 'inspect',
        ref: 'spatengriff',
        count: 1,
        label: 'Abgebrochenen Spatengriff untersuchen',
        text: 'Im Laub steckt ein abgebrochener Holzgriff. Oben eingebrannt: die Zahl 14. Die Beete der Gartengemeinschaft sind durchnummeriert.',
      },
      {
        type: 'talk',
        npcId: 'barbier',
        count: 1,
        label: 'Mit dem Barbier sprechen',
        text: 'Stiefel mit Sohlen aus Reifengummi? Das macht in Babylos keiner außer Hubert. Der flickt alles so. Ich habe ihm die Sohlen vorletzte Woche neu zugeschnitten. Warum fragst du?',
      },
      { type: 'kill', enemyType: 'marauder', count: 3, label: 'Marodeure getötet' },
    ],
    rewards: { xp: 760, gold: 120, items: [{ itemId: 'padded_vest', quantity: 1 }] },
  },
  mord_7a: {
    id: 'mord_7a',
    name: 'Die Anklage: Kolja',
    level: 12,
    giverNpc: 'greta',
    turnInNpc: 'greta',
    requires: 'mord_6',
    excludes: ['mord_7b'],
    offerText:
      'Ich muss mich entscheiden, und ich will es nicht allein tun. Wenn du sagst, dass es Kolja war, dann geh zu ihm und sag es ihm ins Gesicht. Die Tasche, der Zettel, das Geld, das er schuldete. Ob das reicht, entscheide ich danach.',
    progressText: 'Geh zu Kolja. Sag ihm, was du weißt.',
    completeText:
      'Dann ist er es also. Ich hätte erwartet, dass es sich anders anfühlt. Danke. Hier, das habe ich für dich zurückgelegt. Jonas hätte gewollt, dass du es bekommst.',
    objectives: [
      {
        type: 'talk',
        npcId: 'kolja',
        count: 1,
        label: 'Kolja zur Rede stellen',
        text: 'Kolja wird blass. „Ich habe ihn gefunden. Und ich habe die Tasche genommen, ja, weil ich Angst hatte, dass man mir die Schuld gibt. Genau das passiert jetzt.“ Er sieht dich an, ohne zu blinzeln. Du erkennst, dass er die Wahrheit sagen könnte, und dass es ihm nichts mehr nützen wird.',
      },
    ],
    rewards: { xp: 700, gold: 150, items: [{ itemId: 'leather_jacket', quantity: 1 }] },
  },
  mord_7b: {
    id: 'mord_7b',
    name: 'Die Anklage: Hubert',
    level: 12,
    giverNpc: 'greta',
    turnInNpc: 'greta',
    requires: 'mord_6',
    excludes: ['mord_7a'],
    offerText:
      'Ich muss mich entscheiden, und ich will es nicht allein tun. Wenn du sagst, dass es Hubert war, dann geh zu ihm und sag es ihm ins Gesicht. Der Schraubenschlüssel, der Spatengriff, die Stiefel. Ob das reicht, entscheide ich danach.',
    progressText: 'Geh zu Hubert. Sag ihm, was du weißt.',
    completeText:
      'Er hat es zugegeben. Wegen eines Beets. Ich weiß nicht, ob ich schreien oder lachen soll. Danke, dass du nicht aufgegeben hast. Hier, das habe ich für dich zurückgelegt. Jonas hätte gewollt, dass du es bekommst.',
    objectives: [
      {
        type: 'talk',
        npcId: 'hubert',
        count: 1,
        label: 'Hubert zur Rede stellen',
        text: 'Hubert starrt auf den abgebrochenen Spatengriff in deiner Hand. Dann setzt er sich auf den Boden. „Er hat mein Beet zerstört. Zum dritten Mal. Ich wollte nur, dass er aufhört.“ Er schüttelt den Kopf. „Ich wollte ihn nicht töten.“ Mehr sagt er nicht mehr.',
      },
    ],
    rewards: { xp: 900, gold: 150, items: [{ itemId: 'leather_jacket', quantity: 1 }] },
  },
  mord_8a: {
    id: 'mord_8a',
    name: 'Nachhall: Kolja',
    level: 12,
    giverNpc: 'greta',
    turnInNpc: 'greta',
    requires: 'mord_7a',
    offerText:
      'Kolja ist weg. Man hat ihn gestern über den Zaun geschickt, ohne Gepäck. Frag den Gastwirt, wie Babylos darüber redet. Ich traue mich nicht in die Schenke.',
    progressText: 'Der Gastwirt weiß, wie über Kolja geredet wird.',
    completeText:
      'In der Nacht nach dem Urteil hat jemand Huberts Beet in Ordnung gebracht. Ohne Namen, ohne Wort. Ich weiß nicht, was das bedeutet. Vielleicht gar nichts. Nimm das. Es ist nicht genug, aber es ist alles, was ich habe.',
    objectives: [
      {
        type: 'talk',
        npcId: 'gastwirt',
        count: 1,
        label: 'Mit dem Gastwirt über das Urteil sprechen',
        text: 'Kolja? Haben sie über den Zaun geschickt, bei Dämmerung. Seitdem trinkt hier keiner mehr laut. Greta schläft schlechter, nicht besser, sagt man. Es heißt, jemand habe in der Nacht danach Huberts Beet bewässert. Wer, weiß keiner.',
      },
    ],
    rewards: { xp: 600, gold: 100, items: [{ itemId: 'kevlar_vest', quantity: 1 }] },
  },
  mord_8b: {
    id: 'mord_8b',
    name: 'Nachhall: Hubert',
    level: 12,
    giverNpc: 'greta',
    turnInNpc: 'greta',
    requires: 'mord_7b',
    offerText:
      'Hubert sitzt im Lagerraum hinter dem Markt, bis die Gemeinschaft entschieden hat, was mit ihm geschieht. Frag den Gastwirt, was man sich erzählt. Ich selbst will es nicht hören.',
    progressText: 'Der Gastwirt weiß, wie über Hubert geredet wird.',
    completeText:
      'Sie haben ihm das Beet genommen und das Wasserrecht gestrichen. Das ist das Mildeste, was man ihm antun konnte, und das Härteste, was er ertragen kann. Kolja hat sich heute bei mir entschuldigt, für die Tasche. Ich habe ihm die Hand gegeben. Nimm das hier. Es ist nicht genug.',
    objectives: [
      {
        type: 'talk',
        npcId: 'gastwirt',
        count: 1,
        label: 'Mit dem Gastwirt über das Urteil sprechen',
        text: 'Hubert? Sitzt hinten im Lagerraum. Sie wollen ihm das Beet nehmen und das Wasserrecht streichen. Die einen finden es zu viel, die anderen zu wenig. Seit gestern grüßt ihn niemand mehr, und er sitzt da und sieht auf seine Hände.',
      },
    ],
    rewards: { xp: 700, gold: 100, items: [{ itemId: 'kevlar_vest', quantity: 1 }] },
  },
};
