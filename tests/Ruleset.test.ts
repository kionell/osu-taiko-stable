import fs from 'fs';
import path from 'path';
import { HitResult, IScoreInfo, ScoreInfo } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';
import { ITestAttributes, IModdedAttributes } from './Attributes';
import {
  TaikoRuleset,
  TaikoDifficultyAttributes,
  TaikoBeatmap,
} from '../src';

const ruleset = new TaikoRuleset();
const decoder = new BeatmapDecoder();

describe('Standard converted beatmaps', () => testRuleset('Standard'));
describe('Taiko specific beatmaps', () => testRuleset('Taiko'));
describe('Catch converted beatmaps', () => testRuleset('Catch'));
describe('Mania converted beatmaps', () => testRuleset('Mania'));

function testRuleset(rulesetName: string): void {
  const rulesetPath = path.resolve(__dirname, `./Files/${rulesetName}`);

  testBeatmaps(rulesetPath);
}

async function testBeatmaps(rulesetPath: string): Promise<void> {
  const beatmapsPath = path.resolve(rulesetPath, './Beatmaps');
  const beatmapFiles = fs.readdirSync(beatmapsPath);

  for (const beatmapFile of beatmapFiles) {
    const beatmapPath = path.resolve(beatmapsPath, beatmapFile);
    const beatmapId = beatmapFile.split('.')[0];

    const attributesPath = `${rulesetPath}/Attributes/${beatmapId}.json`;
    const attributesData = fs.readFileSync(attributesPath).toString();
    const attributes: IModdedAttributes = JSON.parse(attributesData);

    const decoded = await decoder.decodeFromPath(beatmapPath, false);

    for (const acronym in attributes) {
      const mods = ruleset.createModCombination(acronym);
      const beatmap = ruleset.applyToBeatmapWithMods(decoded, mods);

      testBeatmap(beatmap, attributes[acronym]);
    }
  }
}

function testBeatmap(beatmap: TaikoBeatmap, data: ITestAttributes): void {
  const acronyms = beatmap.mods.toString();

  const difficultyCalculator = ruleset.createDifficultyCalculator(beatmap);
  const difficulty = difficultyCalculator.calculate();

  const score = simulateScore(difficulty);
  const performanceCalculator = ruleset.createPerformanceCalculator(difficulty, score);
  const performance = performanceCalculator.calculateAttributes();

  const { artist, title, version } = beatmap.metadata;

  describe(`${artist} - ${title} [${version}] +${acronyms}`, () => {
    it('Should match beatmap max combo', () => {
      expect(difficulty.maxCombo).toEqual(data.maxCombo);
    });

    it('Should match total star rating', () => {
      expect(difficulty.starRating).toBeCloseTo(data.starRating, 6);
    });

    it('Should match stamina difficulty', () => {
      expect(difficulty.staminaDifficulty).toBeCloseTo(data.staminaDifficulty, 6);
    });

    it('Should match rhythm difficulty', () => {
      expect(difficulty.rhythmDifficulty).toBeCloseTo(data.rhythmDifficulty, 6);
    });

    it('Should match colour difficulty', () => {
      expect(difficulty.colourDifficulty).toBeCloseTo(data.colourDifficulty, 6);
    });

    it('Should match peak difficulty', () => {
      expect(difficulty.peakDifficulty).toBeCloseTo(data.peakDifficulty, 6);
    });

    it('Should match great hit window', () => {
      expect(difficulty.greatHitWindow).toBeCloseTo(data.greatHitWindow, 1);
    });

    it('Should match total performance', () => {
      expect(performance.totalPerformance).toBeCloseTo(data.totalPerformance, 6);
    });

    it('Should match difficulty performance', () => {
      expect(performance.difficultyPerformance).toBeCloseTo(data.difficultyPerformance, 6);
    });

    it('Should match accuracy performance', () => {
      expect(performance.accuracyPerformance).toBeCloseTo(data.accuracyPerformance, 6);
    });

    it('Should match effective miss count', () => {
      expect(performance.effectiveMissCount).toBeCloseTo(data.effectiveMissCount, 1);
    });
  });
}

function simulateScore(attributes: TaikoDifficultyAttributes): IScoreInfo {
  const score = new ScoreInfo({
    maxCombo: attributes.maxCombo,
    mods: attributes.mods,
    accuracy: 1,
  });

  score.statistics.set(HitResult.Great, attributes.maxCombo);

  return score;
}
