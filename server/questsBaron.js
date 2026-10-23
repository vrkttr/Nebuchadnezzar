export const BARON_QUESTS = {
  baron_1: {
    id: 'baron_1',
    name: 'Der Mann mit dem Durst',
    level: 13,
    giverNpc: 'baron',
    turnInNpc: 'baron',
    requires: null,
    offerText:
      'Man nennt mich Baron. Das Blutig sagen sie nur hinter meinem Rücken, und ich tue so, als würde ich es nicht hören. Meine Frau Annelie und meine Tochter Tamara sind seit neun Tagen weg. Einfach weg, ohne ein Wort. Ich suche sie, aber ich bin nicht der Mann, dem man hier gern etwas erzählt. Dir erzählen sie es vielleicht. Frag den Gastwirt und den Barbier, die sehen alle, die hier vorbeikommen.',
    progressText: 'Der Gastwirt und der Barbier. Sie wissen mehr, als sie einem wie mir sagen.',
    completeText:
      'Sie ist also nachts gegangen, mit einem Bündel, und Tamara an der Hand. Ohne ein Wort zu mir. ... Ja. Ich weiß, warum das so ist. Lass uns nicht darüber reden, noch nicht. Such weiter. Ich bezahle dich dafür.',
    objectives: [
      {
        type: 'talk',
        npcId: 'gastwirt',
        count: 1,
        label: 'Mit dem Gastwirt sprechen',
        text: 'Annelie? Die war vor neun Tagen bei mir, spät, nach der Sperrstunde. Wollte nichts trinken, nur Wasser, und ob ich ein Zimmer für eine Nacht hätte. Ich habe Nein gesagt, weil ich keinen Ärger mit dem Baron will. Das bereue ich. Sie hatte das Mädchen an der Hand und einen Schal, hoch bis ans Kinn, obwohl es warm war.',
      },
      {
        type: 'talk',
        npcId: 'barbier',
        count: 1,
        label: 'Mit dem Barbier sprechen',
        text: 'Der Baron? Kommt alle zwei Wochen und redet nicht. Seine Frau war einmal hier, wegen der Haare der Kleinen. Sie hat die ganze Zeit die Tür beobachtet. Ich habe gelernt, bei Kunden, die so schauen, nicht zu fragen. Wenn du mich fragst: Wer so schaut, hat Angst vor dem, der draußen vor dem Fenster vorbeigeht.',
      },
    ],
    rewards: { xp: 640, gold: 90, items: [{ itemId: 'bandage', quantity: 3 }] },
  },
  baron_2: {
    id: 'baron_2',
    name: 'Ein leeres Haus',
    level: 13,
    giverNpc: 'baron',
    turnInNpc: 'baron',
    requires: 'baron_1',
    offerText:
      'Sieh dir mein Zelt an, wenn du willst. Ich habe nichts angefasst. Ich ertrage es nicht, dort zu sein. Die Feuerstelle davor, den Nähkorb, Tamaras Zeichnung. Vielleicht siehst du, was ich nicht sehe.',
    progressText: 'Die Feuerstelle, der Nähkorb, Tamaras Zeichnung. Ich bleibe hier draußen.',
    completeText:
      'Du hast es gesehen. Die Feuerstelle. ... Ich habe die Steine gestern erst gefegt, weil ich dachte, es fällt sonst auf. Es ist nicht so, wie du denkst. Es ist ... doch. Es ist genau so. Ich bin nicht stolz darauf.',
    objectives: [
      {
        type: 'inspect',
        ref: 'baron_feuer',
        count: 1,
        label: 'Die Feuerstelle vor dem Zelt des Barons untersuchen',
        text: 'Auf den Pflastersteinen vor dem Zelt sind dunkle Flecken, mit einem Lappen verschmiert, aber nicht entfernt. Ein Stuhl liegt umgestürzt, ein Bein ist abgebrochen. An der Kante der Kiste klebt ein Haar, blond, mit einem Tropfen getrocknetem Blut daran.',
      },
      {
        type: 'inspect',
        ref: 'baron_korb',
        count: 1,
        label: 'Den Nähkorb untersuchen',
        text: 'Der Korb steht leer neben der Schlafstelle. Nadeln, Garn und eine Schere fehlen, ebenso das Wintergewand, das sonst ganz oben liegt. Wer so packt, hat vorgehabt, lange wegzubleiben.',
      },
      {
        type: 'inspect',
        ref: 'baron_bild',
        count: 1,
        label: 'Tamaras Zeichnung untersuchen',
        text: 'Mit Kohle auf eine Pappe gemalt: ein Zelt, zwei große Figuren und eine kleine. Die eine große Figur steht abseits, ein ganzes Stück vom Zelt entfernt, und ist mit schweren, dunklen Strichen ausgemalt. Darunter steht, in ungelenker Schrift: „Wenn Papa böse ist, gehen wir in den Wald.“',
      },
    ],
    rewards: { xp: 700, gold: 100, items: [{ itemId: 'painkillers', quantity: 2 }] },
  },
  baron_3: {
    id: 'baron_3',
    name: 'Was die Nachbarn sehen',
    level: 14,
    giverNpc: 'baron',
    turnInNpc: 'baron',
    requires: 'baron_2',
    offerText:
      'Sie ist nicht einfach in den Wald. Jemand muss sie mit Vorräten versorgt haben. Frag den Apotheker, den Allgemeinhändler, und Greta. Die Frauen reden miteinander, wenn die Männer nicht zuhören.',
    progressText: 'Der Apotheker, der Allgemeinhändler und Greta. Sie haben etwas gesehen, das ich nicht sehen wollte.',
    completeText:
      'Verbandszeug, Vorräte, ein Gespräch über die Straße nach Süden. Sie hat es geplant. Sie hat es wirklich geplant. Ich dachte immer, sie sei zu ... Ich weiß nicht, was ich dachte. Folge ihrer Spur. Aber wenn du sie findest ... sag es mir erst, bevor du etwas tust.',
    objectives: [
      {
        type: 'talk',
        npcId: 'apotheker',
        count: 1,
        label: 'Mit dem Apotheker sprechen',
        text: 'Annelie? Sie war vor zehn Tagen hier. Hat Verbandszeug und Arnikasalbe gekauft, für sich, sagte sie. Ein Handgelenk war blau verfärbt, und an der Wange hatte sie einen Fleck, den sie mit Puder überdeckt hat. Ich habe nichts gesagt. Ich weiß, was ich gesehen habe. Aber ich weiß auch, wen es betrifft.',
      },
      {
        type: 'talk',
        npcId: 'allgemeinhaendler',
        count: 1,
        label: 'Mit dem Allgemeinhändler sprechen',
        text: 'Sie hat Brot, Konserven und zwei Wolldecken gekauft. Und gefragt, ob ich weiß, wie weit die Straße nach Süden begehbar ist. Ich habe gesagt: bis zu den Wracks, danach nicht mehr. Sie hat genickt und bezahlt, in kleinen Münzen. Man sieht, wer lange gespart hat.',
      },
      {
        type: 'talk',
        npcId: 'greta',
        count: 1,
        label: 'Mit Greta sprechen',
        text: 'Annelie saß manchmal bei mir, nach dem Tod von Jonas. Sie hat nicht viel gesagt. Nur einmal: dass man in einem Haus auch verschwinden kann, ohne dass jemand es merkt. Ich habe ihr eine Adresse im Wald genannt, einen Platz, an dem man in Ruhe sein kann. Mehr sage ich nicht. Wenn sie gefunden werden will, soll sie es selbst entscheiden.',
      },
    ],
    rewards: { xp: 760, gold: 110, items: [{ itemId: 'medkit', quantity: 1 }] },
  },
  baron_4: {
    id: 'baron_4',
    name: 'Die Straße nach Süden',
    level: 14,
    giverNpc: 'baron',
    turnInNpc: 'baron',
    requires: 'baron_3',
    offerText:
      'Südlich der Stadt gibt es eine Straße, die zwischen den Wracks verschwindet. Dort hat man sie zuletzt gesehen. Das Gebiet ist nicht sicher, Deserteure treiben sich herum. Sieh nach, ob eine Spur zu finden ist, und räum auf, was dir den Weg versperrt.',
    progressText: 'Die Straße nach Süden. Deserteure treiben sich zwischen den Wracks herum.',
    completeText:
      'Karrenspuren, kleine Schuhe daneben. Beide Spuren gehen nach Westen weg, nicht nach Süden. Sie hat gesagt, sie wolle nach Süden, damit jemand ihr hinterherläuft und sich irrt. Klug. Sie war immer klüger als ich.',
    objectives: [
      {
        type: 'inspect',
        ref: 'baron_karrenspur',
        count: 1,
        label: 'Die Karrenspur an der Südstraße untersuchen',
        text: 'Im Staub zeichnen sich Karrenräder ab und daneben der Abdruck kleiner Schuhe, ein Kind, das ein Stück neben der Spur herläuft. Dann, nach dreißig Schritten, biegen beide Spuren scharf nach Westen ab, durch das Gras zwischen die Bäume. Die Straße nach Süden war eine Täuschung.',
      },
      { type: 'kill', enemyType: 'deserter', count: 3, label: 'Deserteure getötet' },
    ],
    rewards: { xp: 820, gold: 120, items: [{ itemId: 'ammo_shell', quantity: 12 }] },
  },
  baron_5: {
    id: 'baron_5',
    name: 'Das Lager im Wald',
    level: 14,
    giverNpc: 'baron',
    turnInNpc: 'baron',
    requires: 'baron_4',
    offerText:
      'Westlich. Im Wald, wo die Spur aufhört. Such eine Stelle, an der man sich verstecken kann. Wenn du sie findest, rede mit ihr. Sag mir danach, was sie gesagt hat. Bitte.',
    progressText: 'Westlich, im Wald, südlich vom Waldweg. Such eine Stelle, die jemand hergerichtet hat.',
    completeText:
      'Ihr geht es also gut, so weit. Und sie will nicht, dass ich es weiß. ... Dann sag es mir trotzdem. Wo ist sie? Nein. Warte. Ich frage dich nicht danach. Noch nicht. Ich muss erst entscheiden, ob ich es überhaupt hören will.',
    objectives: [
      { type: 'reach', zone: 'babylos', x: -100, z: 75, radius: 14, count: 1, label: 'Den Wald im Südwesten absuchen' },
      {
        type: 'talk',
        npcId: 'annelie',
        count: 1,
        label: 'Mit Annelie sprechen',
        text: 'Annelie sitzt auf einem Baumstumpf, die Hände im Schoß. Sie hat dich schon von Weitem gesehen. „Er hat dich geschickt.“ Es ist keine Frage. „Ich gehe nicht zurück. Das hat nichts mit Mut zu tun. Es ist, dass ich es diesmal nicht überlebt hätte, und Tamara hätte es gesehen.“ Sie schaut zu den Bäumen. „Tamara ist seit drei Tagen weg. Sie wollte Wasser holen und ist nicht wiedergekommen. Sie hat gesagt, sie wisse einen sicheren Ort im Nordosten, hinter dem Waldrand. Ich bin nicht mehr durchgekommen, weil ... weil ich nicht dort sein darf, wo er suchen würde.“',
      },
    ],
    rewards: { xp: 880, gold: 130, items: [{ itemId: 'canned_food', quantity: 3 }] },
  },
  baron_6a: {
    id: 'baron_6a',
    name: 'Die Wahrheit',
    level: 14,
    giverNpc: 'baron',
    turnInNpc: 'baron',
    requires: 'baron_5',
    excludes: ['baron_6b'],
    offerText:
      'Sag mir, wo sie ist. Ich weiß, was ich getan habe. Ich verspreche, dass ich ohne Waffe komme und keinen Schritt weiter, als sie es erlaubt. Aber ich muss sie sehen. Und ich muss wissen, wo meine Tochter ist.',
    progressText: 'Geh zu Annelie und sag ihr, dass der Baron kommen will, allein und unbewaffnet.',
    completeText:
      'Sie hat zugestimmt. Zehn Minuten, nicht mehr, im Abstand von zehn Schritten. Ich habe nicht damit gerechnet. Ich habe vor vielen Jahren aufgehört, mit irgendetwas zu rechnen. Danke. Das hier ist für dich. Ich hoffe, ich verdiene noch einmal etwas Besseres.',
    objectives: [
      {
        type: 'talk',
        npcId: 'annelie',
        count: 1,
        label: 'Annelie von der Bitte des Barons erzählen',
        text: 'Annelie schweigt lange. „Er will kommen.“ Sie dreht den Kopf zur Seite. „Zehn Schritte Abstand. Keine Hände in den Taschen. Und wenn er nur einmal laut wird, gehe ich, und ihr seht mich nie wieder.“ Sie nickt schwer. „Sag es ihm. Aber ich sage es dir: Ich tue das nicht für ihn. Ich tue es für Tamara.“',
      },
    ],
    rewards: { xp: 700, gold: 160, items: [{ itemId: 'shotgun', quantity: 1 }] },
  },
  baron_6b: {
    id: 'baron_6b',
    name: 'Das Versprechen',
    level: 14,
    giverNpc: 'baron',
    turnInNpc: 'baron',
    requires: 'baron_5',
    excludes: ['baron_6a'],
    offerText:
      'Du hast nichts gefunden. Das sagst du, ja? Ich merke, wenn jemand lügt. Aber ich merke auch, wenn jemand etwas beschützt. Entscheide dich. Geh zu ihr und sag ihr, dass ich nichts weiß und dich nie gefragt habe, oder sag mir die Wahrheit.',
    progressText: 'Geh zu Annelie. Sag ihr, dass du dein Wort hältst.',
    completeText:
      'Du hast also entschieden. Gut. Ich werde nicht mehr fragen. Das hier bekommst du dafür, dass du mir nichts sagst, was ich nicht ertragen würde. Und wenn Tamara zurückkommt, lasse ich sie zu ihrer Mutter gehen. Das ist ein Versprechen. Auch wenn ich es nicht verdient habe.',
    objectives: [
      {
        type: 'talk',
        npcId: 'annelie',
        count: 1,
        label: 'Annelie sagen, dass du schweigst',
        text: 'Annelie schließt kurz die Augen. „Danke.“ Mehr sagt sie nicht, sie wischt sich nur mit dem Ärmel über das Gesicht. Nach einer Weile: „Wenn du Tamara findest, bring sie zu mir. Egal, was er sagt.“ Dann holt sie ein Stück Brot aus dem Bündel und teilt es mit dir, als sei es das Einzige, was sie dir geben kann.',
      },
    ],
    rewards: { xp: 700, gold: 140, items: [{ itemId: 'military_pants', quantity: 1 }] },
  },
  baron_7: {
    id: 'baron_7',
    name: 'Tamaras Spur',
    level: 15,
    giverNpc: 'annelie',
    turnInNpc: 'annelie',
    requiresAny: ['baron_6a', 'baron_6b'],
    offerText:
      'Tamara ist vor drei Tagen in den Nordosten gelaufen. Dort beginnt hinter dem Waldrand ein schmaler Weg zwischen den Bäumen. Sie sagte, sie kenne einen Platz, an dem niemand sie findet. Ich traue mich nicht, ihr zu folgen, weil ich nicht weiß, wen sie dort trifft. Du bist stark genug. Bitte.',
    progressText: 'Im Nordosten, hinter dem Waldrand, beginnt ein schmaler Weg. Die wilden Hunde dort sind gefährlich.',
    completeText:
      'Ein Schal. Ihr roter Schal. Sie trägt ihn nie freiwillig ab. ... Die Spur führt in den Wald hinein. In diese Richtung führt ein Pfad, den niemand benutzt. Ich habe nie gewusst, wohin der führt. Ich bete, dass sie nicht weit gekommen ist.',
    objectives: [
      {
        type: 'inspect',
        ref: 'baron_schal',
        count: 1,
        label: 'Roten Schal am Waldrand untersuchen',
        text: 'Am Rand eines Weidenbuschs hängt ein roter Wollschal, an den Fransen zerfranst. Er ist feucht vom Tau. Daneben, im Boden, kleine Fußabdrücke, eilig, tief im Absatz. Sie laufen nach Nordosten, auf einen schmalen Pfad zu, der sich zwischen den Bäumen verliert.',
      },
      {
        type: 'inspect',
        ref: 'baron_pfad',
        count: 1,
        label: 'Schmalen Waldpfad untersuchen',
        text: 'Ein Pfad, kaum breiter als ein Mensch, von Farn und Brombeeren halb zugewachsen. Er führt zwischen hohen Fichten in den Wald hinein, tiefer, als das Licht reicht. Am ersten Baum hängt ein Stück roter Wolle im Gestrüpp. Dann nichts mehr. Wer dort hineingeht, geht allein.',
      },
      { type: 'kill', enemyType: 'feral_dog', count: 3, label: 'Wilde Hunde getötet' },
    ],
    rewards: { xp: 1000, gold: 170, items: [{ itemId: 'medkit', quantity: 2 }] },
  },
  baron_8a: {
    id: 'baron_8a',
    name: 'Nachhall: Der Baron und Annelie',
    level: 15,
    giverNpc: 'baron',
    turnInNpc: 'baron',
    requires: 'baron_7',
    alsoRequires: ['baron_6a'],
    offerText:
      'Ich war bei ihr, zehn Minuten, zehn Schritte. Ich habe nicht geredet, ich habe nur zugehört. Frag den Gastwirt, wie man in Babylos darüber redet. Ich traue mich nicht in die Schenke.',
    progressText: 'Der Gastwirt weiß, wie über den Baron geredet wird.',
    completeText:
      'Sie reden also. Gut. Reden ist besser als Schweigen. Ich habe das Trinken aufgegeben. Das erste Mal seit drei Jahren habe ich den Tag nüchtern überstanden. Ich weiß nicht, ob es hilft. Nimm das hier, es ist nicht viel.',
    objectives: [
      {
        type: 'talk',
        npcId: 'gastwirt',
        count: 1,
        label: 'Mit dem Gastwirt über den Baron sprechen',
        text: 'Der Baron? War vor drei Tagen hier, hat Wasser bestellt. Wasser! Keiner hat etwas gesagt, aber alle haben es gesehen. Er hat bezahlt, ist gegangen und hat die Tür nicht zugeschlagen. Das ist mehr, als ich in drei Jahren von ihm erlebt habe.',
      },
    ],
    rewards: { xp: 700, gold: 120, items: [{ itemId: 'hunting_rifle', quantity: 1 }] },
  },
  baron_8b: {
    id: 'baron_8b',
    name: 'Nachhall: Annelies Versprechen',
    level: 15,
    giverNpc: 'baron',
    turnInNpc: 'baron',
    requires: 'baron_7',
    alsoRequires: ['baron_6b'],
    offerText:
      'Ich habe nichts gefragt, und du hast nichts gesagt. Das ist ein seltsames Gefühl, wie ein Handel, den keiner abgeschlossen hat. Frag den Gastwirt, wie man über mich redet. Ich muss wissen, ob es sich herumgesprochen hat.',
    progressText: 'Der Gastwirt weiß, wie über den Baron geredet wird.',
    completeText:
      'Sie sagen, ich sei stiller geworden. Vielleicht stimmt das. Es ist, als warte man auf ein Urteil, das nicht kommt. Ich werde mich nicht entschuldigen, ich weiß, wie billig das klingt. Aber wenn Tamara zurückkommt, werde ich mich bemühen, ein Mann zu sein, der sie nicht fürchten lässt. Nimm das hier.',
    objectives: [
      {
        type: 'talk',
        npcId: 'gastwirt',
        count: 1,
        label: 'Mit dem Gastwirt über den Baron sprechen',
        text: 'Der Baron? Sitzt abends vor seinem Zelt und sieht auf die Straße. Trinkt nicht mehr, sagt man. Kein Wort, wenn er an jemandem vorbeigeht. Die einen sagen, er sei krank, die anderen, er habe Angst vor etwas. Ich glaube, er wartet auf jemanden. Auf seine Frau, oder auf seine Strafe.',
      },
    ],
    rewards: { xp: 700, gold: 120, items: [{ itemId: 'gas_mask', quantity: 1 }] },
  },
  baron_9: {
    id: 'baron_9',
    name: 'Der schmale Pfad',
    level: 20,
    giverNpc: 'annelie',
    turnInNpc: 'annelie',
    requires: 'baron_7',
    offerText:
      'Der Pfad im Nordosten endet an einem Felsen, hinter dem es dunkel wird. Eine Höhle. Dort muss Tamara sein, wo sonst. Ich kann dich nicht begleiten, ich würde dort unten keine Stunde durchhalten. Du bist stark genug für die Gegner dort. Finde sie. Sag ihr nur, dass ich warte.',
    progressText: 'Im Nordosten endet der schmale Pfad an einem Felsen mit einem dunklen Eingang. Dort musst du sie suchen.',
    completeText:
      'Sie lebt. Sie lebt, und sie hat Wasser und Konserven. Ich sitze hier und halte die Hände still, damit man nicht sieht, wie sie zittern. Danke. Sag nichts davon dem Baron, noch nicht. Sie muss selbst entscheiden, wann sie zurückkommt. Nimm das hier, es ist das Wenige, das wir haben.',
    objectives: [
      { type: 'reach', zone: 'babylos', x: 186, z: -141, radius: 7, count: 1, label: 'Den Höhleneingang im Nordosten erreichen' },
      {
        type: 'inspect',
        ref: 'hoehle_kanne',
        count: 1,
        label: 'Umgestürzte Wasserkanne untersuchen',
        text: 'Eine Blechkanne liegt auf der Seite, der Boden darunter ist noch feucht. Daneben kleine Schuhabdrücke, die tiefer in die Höhle führen. Wer hier entlanggegangen ist, hat nicht getrödelt.',
      },
      {
        type: 'inspect',
        ref: 'hoehle_kreide',
        count: 1,
        label: 'Kreidezeichen an der Wand untersuchen',
        text: 'Mit Kreide ist ein Pfeil an die Wand gemalt, darunter drei Striche. Für jede Abzweigung einer, in der Größe einer Kinderhand. Der Pfeil zeigt weiter nach Norden.',
      },
      {
        type: 'talk',
        npcId: 'tamara',
        count: 1,
        label: 'Mit Tamara sprechen',
        text: 'Tamara drückt sich in die Nische, den roten Schal bis zum Kinn gezogen. „Du bist nicht von ihm. Gut.“ Sie atmet aus. „Sag Mama, es geht mir gut. Ich habe Wasser, ich habe Konserven aus den Kisten. Ich gehe nicht zurück, solange die Verirrten den Weg versperren. Ich höre sie nachts. Wenn der Weg frei ist, komme ich.“',
      },
      { type: 'kill', enemyType: 'lost_one', count: 4, label: 'Verirrte in der Höhle zurückgedrängt' },
    ],
    rewards: { xp: 2400, gold: 320, items: [{ itemId: 'medkit', quantity: 2 }, { itemId: 'kevlar_vest', quantity: 1 }] },
  },
};
