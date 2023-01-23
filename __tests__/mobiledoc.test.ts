import { Mobiledoc, MobiledocAtomType, MobiledocCardType } from '../src/';

describe('Mobiledoc constructor', () => {
  test('Accepts an empty constructor', () => {
    const mobiledoc = new Mobiledoc({});

    expect(mobiledoc).toBeInstanceOf(Mobiledoc);

    expect(mobiledoc.version).toBeUndefined();
    expect(mobiledoc.atoms).toStrictEqual([]);
    expect(mobiledoc.cards).toStrictEqual([]);
    expect(mobiledoc.markups).toStrictEqual([]);
    expect(mobiledoc.sections).toStrictEqual([]);

    expect(typeof mobiledoc.getAtom).toBe('function');
    expect(typeof mobiledoc.getCard).toBe('function');
    expect(typeof mobiledoc.getMarkup).toBe('function');

    expect(mobiledoc.getAtom(0)).toBeUndefined();
    expect(mobiledoc.getCard(0)).toBeUndefined();
    expect(mobiledoc.getMarkup(0)).toBeUndefined();
  });
});

describe('Mobiledoc version', () => {
  test('Accepts a version', () => {
    const mobiledoc = new Mobiledoc({ version: '0.3.2' });

    expect(mobiledoc.version).toEqual('0.3.2');
  });
});

describe('Mobiledoc atoms', () => {
  test('Accepts an array of atoms', () => {
    const atoms = [
      ['mention', '@alice', { id: 1 }],
      ['mention', '@bob', { id: 2 }],
    ] as MobiledocAtomType[];

    const mobiledoc = new Mobiledoc({ atoms });

    expect(mobiledoc.atoms).toStrictEqual(atoms);
    expect(mobiledoc.getAtom(0)).toStrictEqual(atoms[0]);
    expect(mobiledoc.getAtom(1)).toStrictEqual(atoms[1]);
    expect(mobiledoc.getAtom(2)).toBeUndefined();
  });
});

describe('Mobiledoc cards', () => {
  test('Accepts an array of cards', () => {
    const cards = [
      [
        'bookmark',
        {
          type: 'link',
          url: '/',
        },
      ],
      [
        'image',
        {
          type: 'photo',
          src: 'image.jpeg',
        },
      ],
    ] as MobiledocCardType[];

    const mobiledoc = new Mobiledoc({ cards });

    expect(mobiledoc.cards).toStrictEqual(cards);
    expect(mobiledoc.getCard(0)).toStrictEqual(cards[0]);
    expect(mobiledoc.getCard(1)).toStrictEqual(cards[1]);
    expect(mobiledoc.getCard(2)).toBeUndefined();
  });
});

describe('Mobiledoc markups', () => {
  test('Accepts an array of markups', () => {
    const markups = [['em'], ['strong']];

    const mobiledoc = new Mobiledoc({ markups });

    expect(mobiledoc.markups).toHaveLength(2);
    expect(mobiledoc.getMarkup(0)?.[0]).toStrictEqual('em');
    expect(mobiledoc.getMarkup(1)?.[0]).toStrictEqual('strong');
    expect(mobiledoc.getMarkup(2)).toBeUndefined();
  });

  test('Returns an empty array of attributes when none provided', () => {
    const markups = [['em'], ['strong', []]];

    const mobiledoc = new Mobiledoc({ markups });

    expect(mobiledoc.markups).toHaveLength(2);
    expect(mobiledoc.getMarkup(0)).toStrictEqual(['em', []]);
    expect(mobiledoc.getMarkup(1)).toStrictEqual(['strong', []]);
  });

  test('Accepts string attributes', () => {
    const markups = [['a', ['href', 'https://www.example.org/']]];

    const mobiledoc = new Mobiledoc({ markups });

    expect(mobiledoc.markups).toHaveLength(1);
    expect(mobiledoc.getMarkup(0)).toStrictEqual(markups[0]);
  });

  test('Accepts an odd number of attribute strings', () => {
    const markups = [['a', ['href', 'https://www.example.org/', 'rel']]];

    const mobiledoc = new Mobiledoc({ markups });

    expect(mobiledoc.markups).toHaveLength(1);
    expect(mobiledoc.getMarkup(0)).toStrictEqual(markups[0]);
  });

  test('Rejects non-string attributes', () => {
    expect(() => {
      new Mobiledoc({ markups: [['a', ['href', 1]]] } as never);
    }).toThrowError();

    expect(() => {
      new Mobiledoc({ markups: [['a', ['href', true]]] } as never);
    }).toThrowError();

    expect(() => {
      new Mobiledoc({ markups: [['a', ['href', undefined]]] } as never);
    }).toThrowError();

    expect(() => {
      new Mobiledoc({ markups: [['a', ['href', []]]] } as never);
    }).toThrowError();

    expect(() => {
      new Mobiledoc({ markups: [['a', ['href', {}]]] } as never);
    }).toThrowError();
  });

  test('Rejects non-string tag name', () => {
    expect(() => {
      new Mobiledoc({ markups: [[1]] } as never);
    }).toThrowError();

    expect(() => {
      new Mobiledoc({ markups: [[true]] } as never);
    }).toThrowError();

    expect(() => {
      new Mobiledoc({ markups: [[undefined]] } as never);
    }).toThrowError();

    expect(() => {
      new Mobiledoc({ markups: [[[]]] } as never);
    }).toThrowError();

    expect(() => {
      new Mobiledoc({ markups: [[{}]] } as never);
    }).toThrowError();

    expect(() => {
      new Mobiledoc({ markups: [[]] } as never);
    }).toThrowError();
  });
});

describe('Mobiledoc sections', () => {
  test('Accepts an array of sections', () => {
    const sections = [
      [1, 'p', [[0, [], 0, 'Hello world!']], ['align', 'center']],
      [1, 'p', [[0, [], 0, 'Hello again!']], []],
      [1, 'p', [[0, [], 0, 'No attributes for me.']]],
    ];

    const mobiledoc = new Mobiledoc({ sections });

    expect(mobiledoc.sections).toHaveLength(3);
    expect(mobiledoc.sections[0]).toStrictEqual(sections[0]);
    expect(mobiledoc.sections[1]).toStrictEqual(sections[1]);
    expect(mobiledoc.sections[2]).toStrictEqual([1, 'p', [[0, [], 0, 'No attributes for me.']], undefined]);
    expect(mobiledoc.sections[3]).toBeUndefined();
  });

});
