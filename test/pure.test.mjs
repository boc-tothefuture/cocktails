import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHash } from '../src/route.ts';
import { formatNumber, pluralizeUnit } from '../src/scaler.ts';
import { inferAutoShelf, matchCanonicalRule } from '../src/vault-matcher.ts';

test('parseHash handles compound bartender fragments', () => {
  assert.deepEqual(parseHash('#vault&bartender'), {
    raw: 'vault&bartender',
    parts: ['vault', 'bartender'],
    target: 'vault',
    hasBartender: true
  });
  assert.equal(parseHash('#bartender').target, '');
  assert.equal(parseHash('#bartender').hasBartender, true);
  assert.equal(parseHash('#session-x&bartender').target, 'session-x');
  assert.equal(parseHash('').hasBartender, false);
  assert.equal(parseHash('#').target, '');
});

test('formatNumber trims trailing zeros and never yields NaN', () => {
  assert.equal(formatNumber(1.5 * 3), '4.5');
  assert.equal(formatNumber(0.125 * 6), '0.75');
  assert.equal(formatNumber(2), '2');
});

test('pluralizeUnit', () => {
  assert.equal(pluralizeUnit('dash', 1), 'dash');
  assert.equal(pluralizeUnit('dash', 2), 'dashes');
  assert.equal(pluralizeUnit('dashes', 1), 'dash');
  assert.equal(pluralizeUnit('leaf', 3), 'leaves');
  assert.equal(pluralizeUnit('ml', 4), 'ml');
  assert.equal(pluralizeUnit(null, 4), '');
});

test('matchCanonicalRule: first match wins, specific before generic', () => {
  const id = (name) => matchCanonicalRule(name)?.id;
  assert.equal(id('irish whiskey'), 'irish_whiskey');
  assert.equal(id('bushmills irish whiskey'), 'irish_whiskey');
  assert.equal(id('rittenhouse rye whiskey'), 'whiskey');
  assert.equal(id('bourbon cream'), 'irish_cream');
  assert.equal(id('baileys original irish cream'), 'irish_cream');
  assert.equal(id('coffee liqueur'), 'coffee_liqueur');
  assert.equal(id('peppermint schnapps'), 'peppermint_schnapps');
  assert.equal(id('fat-free half-and-half'), 'dairy_cream');
  assert.equal(id('ginger beer'), 'soda_ginger');
  assert.equal(id('ginger liqueur'), 'spiced_melon_ginger');
  assert.equal(id('gin'), 'gin');
  assert.equal(id("peychaud's bitters"), 'bitters');
  assert.equal(id('something unheard of'), undefined);
});

test('inferAutoShelf puts home-made mixers in the pantry', () => {
  assert.equal(inferAutoShelf('house fresh ginger syrup'), 'pantry');
  assert.equal(inferAutoShelf('mystery amaro'), 'modifiers');
});
