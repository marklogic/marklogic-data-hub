import { Matching } from "./matching.model";

/**
 * Represents a set of match options for UI display.
 */
export class MatchOptions {
  public options: Array<MatchOption> = [];

  /**
   * Construct match options based on a JSON matching configuration.
   */
  static fromMatching(matching: Matching) {
    const result = new MatchOptions();
    const algs = matching.algorithms['algorithm'];
    if (matching.scoring && matching.scoring['add']) {
      matching.scoring['add'].forEach(a => {
        result.options.push(MatchOption.fromMatching(a, algs));
      })
    }
    if (matching.scoring && matching.scoring['expand']) {
      matching.scoring['expand'].forEach(e => {
        result.options.push(MatchOption.fromMatching(e, algs));
      })
    }
    if (matching.scoring && matching.scoring['reduce']) {
      matching.scoring['reduce'].forEach(r => {
        result.options.push(MatchOption.fromMatching(r, algs));
      })
    }
    return result;
  }

  /**
   * Add a new match option to the set.
   */
  addOption(opt) {
    this.options.push(new MatchOption(opt));
  }

  /**
   * Update a match option in the set.
   */
  updateOption(opt, index) {
    let mOpt = new MatchOption(opt);
    this.options.splice(index, 1, mOpt);
  }

  /**
   * Delete a match option from the set.
   */
  deleteOption(opt) {
    let i = this.options.findIndex(o => {
      return o === opt;
    })
    if (i >= 0) {
      this.options.splice(i, 1);
    }
  }

}

/**
 * Represents a match option for UI display.
 */
export class MatchOption {
  public matchType: string;
  public propertyName: Array<string>;
  public weight: number;
  public algorithmRef: string;
  public thesaurus: string;
  public filter: string;
  public dictionary: string;
  public distanceThreshold: string;
  public collation: string;
  public zip5match9: number;
  public zip9match5: number;
  public customUri: string;
  public customFunction: string;

  constructor (mOpt: any = {}) {
    if (mOpt.matchType) this.matchType = mOpt.matchType;
    if (mOpt.propertyName) this.propertyName = [mOpt.propertyName];
    if (mOpt.weight) this.weight = mOpt.weight;
    if (mOpt.algorithmRef) this.algorithmRef = mOpt.algorithmRef;
    if (mOpt.thesaurus) this.thesaurus = mOpt.thesaurus;
    if (mOpt.filter) this.filter = mOpt.filter;
    if (mOpt.dictionary) this.dictionary = mOpt.dictionary;
    if (mOpt.distanceThreshold) this.distanceThreshold = mOpt.distanceThreshold;
    if (mOpt.collation) this.collation = mOpt.collation;
    if (mOpt.zip5match9) this.zip5match9 = mOpt.zip5match9;
    if (mOpt.zip9match5) this.zip9match5 = mOpt.zip9match5;
    if (mOpt.customUri) this.customUri = mOpt.customUri;
    if (mOpt.customFunction) this.customFunction = mOpt.customFunction;
  }

  /**
   * Construct a match option from matching configuration data.
   */
  static fromMatching(mOpt: any, algs: any) {
    const result = new MatchOption(mOpt);
    result.matchType = "custom"; // default
    if (mOpt.algorithmRef === undefined) {
      result.matchType = 'exact';
    }
    switch(mOpt.algorithmRef) {
      case "thesaurus":
        result.matchType = "synonym";
        break;
      case "double-metaphone":
        result.matchType = "double metaphone";
        break;
      case "zip-match":
        result.matchType = "zip";
        break;
      case "standard-reduction":
        result.matchType = "reduce";
        break;
    }
    if (result.matchType === 'reduce' && mOpt.allMatch.property) {
      result.propertyName = mOpt.allMatch.property
    }
    if (mOpt.zip) {
      mOpt.zip.forEach(z => {
        if (z.origin === 5) result.zip5match9 = z.weight;
        if (z.origin === 9) result.zip9match5 = z.weight;
      })
    }
    if (result.matchType === 'custom') {
      let alg = algs.find(a => {
        return a.name === mOpt.algorithmRef;
      });
      if (alg.at) result.customUri = alg.at;
      if (alg.function) result.customFunction = alg.function;
    }
    return result;
  }

}
