"use strict";

const DEFAULT_PROFESSION = "unemployed";
const DEFAULT_MOD_URLS = [
  window.location.href + "data/Vanilla.json",
  window.location.href + "data/MoreDescriptionForTraits4166.json",
  window.location.href + "data/ToadTraits.json",
  window.location.href + "data/ToadTraitsDisablePrepared.json",
  window.location.href + "data/ToadTraitsDisableSpec.json",
  window.location.href + "data/ToadTraitsDynamic.json"
];

const SKILL_NAMES = new Map();
SKILL_NAMES.set("Fitness", "Fitness");
SKILL_NAMES.set("Strength", "Strength");
SKILL_NAMES.set("Sprinting", "Sprinting");
SKILL_NAMES.set("Lightfooted", "Lightfooted");
SKILL_NAMES.set("Nimble", "Nimble");
SKILL_NAMES.set("Sneaking", "Sneaking");
SKILL_NAMES.set("Axe", "Axe");
SKILL_NAMES.set("LongBlunt", "Long Blunt");
SKILL_NAMES.set("ShortBlunt", "Short Blunt");
SKILL_NAMES.set("LongBlade", "Long Blade");
SKILL_NAMES.set("ShortBlade", "Short Blade");
SKILL_NAMES.set("Spear", "Spear");
SKILL_NAMES.set("Maintenance", "Maintenance");
SKILL_NAMES.set("Carpentry", "Carpentry");
SKILL_NAMES.set("Cooking", "Cooking");
SKILL_NAMES.set("Farming", "Farming");
SKILL_NAMES.set("FirstAid", "First Aid");
SKILL_NAMES.set("Electrical", "Electrical");
SKILL_NAMES.set("Metalworking", "Metalworking");
SKILL_NAMES.set("Mechanics", "Mechanics");
SKILL_NAMES.set("Tailoring", "Tailoring");
SKILL_NAMES.set("Aiming", "Aiming");
SKILL_NAMES.set("Reloading", "Reloading");
SKILL_NAMES.set("Fishing", "Fishing");
SKILL_NAMES.set("Trapping", "Trapping");
SKILL_NAMES.set("Foraging", "Foraging");

/**
 * @param {integer} boost
 * @returns {string?}
 */
 function getXpBoostText(boost) {
  // TODO: figure out if fitness and strength xp boost is real
  if (boost < 0) return null;
  switch (boost) {
    case 0: return "+25%";
    case 1: return "+75%";
    case 2: return "+100%";
    case 3: return "+125%";
    default: return "+125%";
  }
}

$(window).on("load", function () {
  reload(DEFAULT_MOD_URLS);

  $("#setting-is-multiplayer").on("change", function () {
    if (State.instance == null) return;
    const state = State.get();
    state.settings.isMultiplayer = this.checked;
    // update is required to filter out now-unavailable chosen traits
    state.update();
    state.rebuildInterfaceTraitsProfessions();
    state.saveToCookies();
    state.settings.saveToCookies();
  });

  $("#setting-is-sleep-enabled").on("change", function () {
    if (State.instance == null) return;
    const state = State.get();
    state.settings.isSleepEnabled = this.checked;
    // update is required to filter out now-unavailable chosen traits
    state.update();
    state.rebuildInterfaceTraitsProfessions();
    state.saveToCookies();
    state.settings.saveToCookies();
  });

  $("#setting-show-unavailable").on("change", function () {
    if (State.instance == null) return;
    const state = State.get();
    state.settings.showUnavailable = this.checked;
    state.update();
    state.rebuildInterfaceTraitsProfessions();
    state.settings.saveToCookies();
  });

  $("#reset-build").on("click", function () {
    if (State.instance == null) return;
    const state = State.get();
    state.chosenProfession = null;
    state.chosenTraits = new Set();
    state.update();
    state.rebuildInterfaceTraitsProfessions();
    state.saveToCookies();
  });
});

/** @param {string[]} modUrls */
async function reload(modUrls) {
  let loadedMods = new Map();
  for (let mod of await Promise.all(modUrls.map(fetchJSON))) {
    mod.enabled = mod.id === "Vanilla";
    mod.requires = mod.requires || [];
    mod.incompatible = mod.incompatible || [];
    loadedMods.set(mod.id, mod);
  }

  // Check the state of the setting checkboxes on the page, and load them into the settings
  const settings = Settings.loadFromCookies();
  $("#setting-is-multiplayer").prop("checked", settings.isMultiplayer);
  $("#setting-is-sleep-enabled").prop("checked", settings.isSleepEnabled);
  $("#setting-show-unavailable").prop("checked", settings.showUnavailable);
  State.instance = new State(loadedMods, settings);
  State.instance.loadFromCookies();
  State.instance.rebuildInterfaceFull();
  State.instance.saveToCookies();
  State.instance.settings.saveToCookies();
}

/** @param {Mod} mod */
function createModElement(mod) {
  let modElement = $("<div>").addClass("planner-mod");
  if (mod.workshop_id == null) {
    const modName = $("<span>").text(mod.name);
    const modToggleButtonFake = $("<button>")
      .attr("disabled", true)
      .addClass("mod-enabled")
      .text("Always Enabled");
    modElement.append([modName, modToggleButtonFake]);
  } else {
    const isIncompatible = mod.incompatible.some(id => State.get().loadedMods.get(id).enabled);
    const modAuthor = $("<span>").text(mod.author);
    const modLink = $("<a>").text(mod.name).attr({
      href: link(mod.workshop_id),
      target: "_blank",
      rel: "noopener noreferrer"
    });

    const modName = $("<span>").append([modLink, " by ", modAuthor]);
    const modToggleButton = $("<button>")
      .addClass(isIncompatible ? "" : (mod.enabled ? "mod-enabled" : "mod-disabled"))
      .text(isIncompatible ? "Incompatible" : (mod.enabled ? "Enabled" : "Disabled"));
    if (isIncompatible) {
      modToggleButton.attr("disabled", true);
    } else {
      modToggleButton.on("click", function () {
        const state = State.get();
        state.toggleMod(mod);
        state.rebuildInterfaceFull();
        state.saveToCookies();
      });
    }

    modElement.append([modName, modToggleButton]);
  }

  return modElement;
}

/** @param {string} skill @param {integer} boost */
function createSkillElement(skill, boost) {
  const skillNameElement = $("<span>").addClass("skill-name").text(SKILL_NAMES.get(skill));
  const skillLevelElement = $("<span>").addClass("skill-level").text(boost);
  const skillLevelBarElement = $("<div>").addClass("skill-level-bar pips");
  for (let i = 0; i < boost; i ++) skillLevelBarElement.append($("<div>").addClass("pip"));
  const xpBoostText = skill === "Strength" || skill === "Fitness" ? null : getXpBoostText(boost);
  const skillXpBoostElement = $("<span>").addClass("skill-xp-boost").text(xpBoostText || "");
  return $("<div>").addClass("planner-skill").append([
    skillNameElement, skillLevelElement, skillLevelBarElement, skillXpBoostElement
  ]);
}

/** @param {Trait} trait */
function createTraitElement(trait) {
  const state = State.get();
  let traitElement = $("<div>").addClass("planner-trait");
  let traitNameElement = $("<div>").addClass("planner-trait-name").append([
    $("<div>").addClass("planner-trait-icon-container").append(trait.icon ? [
      $("<img>").addClass("planner-trait-icon").attr("src", trait.icon)
    ] : []),
    $("<span>").text(trait.name)
  ]);

  if (trait.description != null) {
    traitElement.attr("title", trait.description);
  }

  if (trait.isProfessionTrait) {
    traitElement.append(traitNameElement);
  } else {
    const costText = (trait.cost < 0 ? "+" : "-") + Math.abs(trait.cost);
    traitElement.append([traitNameElement, $("<span>").text(costText)]);

    if (state.isTraitAvailable(trait)) {
      const costPolarity = getPointsPolarity(trait.cost);
      if (costPolarity != null) traitElement.addClass(costPolarity);
      traitElement.on("click", function () {
        const state = State.get();
        state.toggleTrait(trait);
        state.rebuildInterfaceTraitsProfessions();
        state.saveToCookies();
      });
    } else {
      traitElement.addClass("unavailable");
    }
  }

  return traitElement;
}

/** @param {Profession} profession */
function createProfessionElement(profession) {
  const state = State.get();
  let professionElement = $("<div>").addClass("planner-profession");
  let professionNameElement = $("<div>").addClass("planner-profession-name");
  professionNameElement.append([
    $("<div>").addClass("planner-profession-icon-container").append(profession.icon ? [
      $("<img>").addClass("planner-profession-icon").attr("src", profession.icon)
    ] : []),
    $("<span>").text(profession.name)
  ]);

  if (profession.description != null) {
    professionElement.attr("title", profession.description);
  }

  if (state.chosenProfession === profession.id) {
    professionElement.addClass("selected");
  }

  professionElement.append(professionNameElement);
  professionElement.on("click", function () {
    const state = State.get();
    state.chosenProfession = profession.id;
    state.rebuildInterfaceTraitsProfessions();
    state.saveToCookies();
  });

  return professionElement;
}

/** @param {Map<string, Mod>} loadedMods */
function getEnabledModData(loadedMods) {
  let mods = Array.from(loadedMods.values())
    .filter(mod => mod.enabled);
  sortMods(mods);
  return mergeMods(mods);
}

class State {
  /** @param {Map<string, Mod>} loadedMods */
  constructor(loadedMods, settings = new Settings()) {
    /** @type {Map<string, Mod>} */
    this.loadedMods = loadedMods;

    /** @type {ModData} */
    this.currentModData = getEnabledModData(this.loadedMods);

    /** @type {Set<string>} */
    this.chosenTraits = new Set();

    /** @type {string?} */
    this.chosenProfession = null;

    /** @type {Settings} */
    this.settings = settings;
  }

  update() {
    this.currentModData = getEnabledModData(this.loadedMods);
    this.chosenTraits = filterSet(this.chosenTraits, id => {
      const trait = this.currentModData.traits.get(id);
      return trait != null ? this.isTraitAvailable(trait) : false;
    });
    if (!this.currentModData.professions.has(this.chosenProfession)) this.chosenProfession = null;
    if (!this.chosenProfession && this.currentModData.professions.has(DEFAULT_PROFESSION)) this.chosenProfession = DEFAULT_PROFESSION;
  }

  rebuildInterfaceFull() {
    this.update();
    this.rebuildInterfaceTraitsProfessions();
    this.rebuildInterfaceMods();
  }

  rebuildInterfaceTraitsProfessions() {
    const enabledProfessions = this.getEnabledProfessions();

    const enabledTraits = this.getEnabledTraits();
    enabledTraits.sort((trait1, trait2) => trait1.cost - trait2.cost);
    const enabledNonChosenTraits = enabledTraits.filter(trait => !this.chosenTraits.has(trait.id));
    const positiveTraits = enabledNonChosenTraits.filter(trait => !trait.isProfessionTrait && trait.cost > 0);
    const negativeTraits = enabledNonChosenTraits.filter(trait => !trait.isProfessionTrait && trait.cost < 0);
    negativeTraits.sort((trait1, trait2) => trait2.cost - trait1.cost);
    const chosenTraits = enabledTraits.filter(trait => this.isTraitChosen(trait.id));

    $("#panel-professions > div.panel-inner").empty().append(enabledProfessions.map(createProfessionElement));
    $("#panel-traits-positive > div.panel-inner").empty().append(positiveTraits.map(createTraitElement));
    $("#panel-traits-negative > div.panel-inner").empty().append(negativeTraits.map(createTraitElement));
    $("#panel-traits-chosen > div.panel-inner").empty().append(chosenTraits.map(createTraitElement));
    const skillsElement = $("#panel-major-skills > div.panel-inner").empty();

    const skills = this.getSkills();
    for (const skill of SKILL_NAMES.keys()) {
      if (skills.has(skill) && skills.get(skill) !== 0) {
        skillsElement.append(createSkillElement(skill, skills.get(skill)));
      }
    }

    setPoints(this.getPointTotal());
  }

  rebuildInterfaceMods() {
    const loadedMods = Array.from(this.loadedMods.values());
    $("#planner-mods-list").empty().append(loadedMods.map(createModElement));
  }

  /** @returns {integer} */
  getPointTotal() {
    const freePoints = this.settings.freePoints;
    const currentProfession = this.currentModData.professions.get(this.chosenProfession);
    let base = freePoints + (currentProfession != null ? currentProfession.points : 0);
    for (const id of this.chosenTraits.values()) {
      base -= this.currentModData.traits.get(id).cost;
    }

    return base;
  }

  /** @returns {Set<string>} */
  getEnabledMods() {
    /** @type {Set<string>} */
    const enabledMods = new Set();
    for (const mod of this.loadedMods.values()) {
      if (mod.enabled && mod.id !== "Vanilla") enabledMods.add(mod.id);
    }

    return enabledMods;
  }

  /** @returns {Trait[]} */
  getEnabledTraits() {
    const allTraits = Array.from(this.currentModData.traits.values());
    return this.settings.showUnavailable ? allTraits
      : allTraits.filter(trait => this.isTraitAvailable(trait));
  }

  /** @returns {Profession[]} */
  getEnabledProfessions() {
    return Array.from(this.currentModData.professions.values());
  }

  /** @returns {Map<string, integer>} */
  getSkills() {
    /** @type {Map<string, integer>} */
    let xpBoosts = new Map();
    xpBoosts.set("Fitness", 5);
    xpBoosts.set("Strength", 5);

    /** @type {(skill: string, boost: integer) => void} */
    const putXpBoost = (skill, boost) => {
      const boostCurrent = xpBoosts.get(skill);
      xpBoosts.set(skill, clamp(0, 10, (boostCurrent || 0) + boost));
    };

    for (const trait of this.currentModData.traits.values()) {
      if (!this.isTraitChosen(trait.id)) continue;
      for (const skill in trait.xpBoosts) {
        putXpBoost(skill, trait.xpBoosts[skill]);
      }
    }

    const currentProfession = this.currentModData.professions.get(this.chosenProfession);
    if (currentProfession != null) {
      for (const skill in currentProfession.xpBoosts) {
        putXpBoost(skill, currentProfession.xpBoosts[skill]);
      }
    }

    return xpBoosts;
  }

  /** @returns {boolean} */
  isTraitChosen(id) {
    const currentProfession = this.currentModData.professions.get(this.chosenProfession);
    return this.chosenTraits.has(id) || (currentProfession != null && currentProfession.freeTraits.includes(id));
  }

  /** @param {Trait} trait @returns {boolean} */
  isTraitAvailable(trait) {
    const currentProfession = this.currentModData.professions.get(this.chosenProfession);
    if (!this.settings.isSleepEnabled && trait.isSleepTrait) return false;
    if (this.settings.isMultiplayer && trait.isDisabledInMp) return false;

    for (const id of trait.exclusives.values()) {
      if (this.chosenTraits.has(id)) return false;
      if (currentProfession != null && currentProfession.freeTraits.includes(id)) return false;
    }

    return true;
  }

  /** @param {Trait} trait */
  toggleTrait(trait) {
    if (this.chosenTraits.has(trait.id)) {
      this.chosenTraits.delete(trait.id);
    } else {
      this.chosenTraits.add(trait.id);
    }
  }

  /** @param {Mod} mod */
  toggleMod(mod) {
    if (mod.enabled) {
      this.disableMod(mod);
    } else {
      this.enableMod(mod);
    }
  }

  /** @param {Mod} mod */
  enableMod(mod) {
    mod.enabled = true;
    for (const requirement of mod.requires) {
      this.enableMod(this.loadedMods.get(requirement));
    }
  }

  /** @param {Mod} mod */
  disableMod(mod) {
    mod.enabled = false;
    for (const otherMod of this.loadedMods.values()) {
      if (otherMod.requires.includes(mod.id)) {
        this.disableMod(otherMod);
      }
    }
  }

  loadFromCookies() {
    const enabledMods = new Set(getOrDefaultCookie("saved_enabled_mods", []));
    for (const mod of this.loadedMods.values()) {
      mod.enabled = (mod.id == "Vanilla" || enabledMods.has(mod.id));
    }

    const { chosenTraits = [], chosenProfession = null } = getOrDefaultCookie("saved_build", {});
    this.chosenTraits = new Set(chosenTraits);
    this.chosenProfession = chosenProfession;
  }

  saveToCookies() {
    const enabledMods = Array.from(this.getEnabledMods().values());
    setCookie("saved_enabled_mods", enabledMods);
    setCookie("saved_build", {
      chosenTraits: Array.from(this.chosenTraits.values()),
      chosenProfession: this.chosenProfession
    });
  }

  /** @param {State} state */
  static set(state) {
    State.instance = state;
  }

  /** @returns {State} */
  static get() {
    if (State.instance == null) {
      throw new Error("no state");
    } else {
      return State.instance;
    }
  }
}

class Settings {
  constructor({
    isMultiplayer = false,
    isSleepEnabled = false,
    showUnavailable = false,
    freePoints = 0
  }) {
    /** @type {boolean} */
    this.isMultiplayer = isMultiplayer;
    /** @type {boolean} */
    this.isSleepEnabled = isSleepEnabled;
    /** @type {boolean} */
    this.showUnavailable = showUnavailable;
    /** @type {integer} */
    this.freePoints = freePoints;
  }

  static loadFromCookies() {
    return new Settings(getOrDefaultCookie("saved_settings", {}));
  }

  saveToCookies() {
    setCookie("saved_settings", this);
  }
}

/** @param {integer} points */
function setPoints(points) {
  $("#points").text(points.toString())
    .attr("class", getPointsPolarity(points));
}

/** @param {integer} points */
function getPointsPolarity(points) {
  switch (true) {
    case points > 0: return "positive";
    case points < 0: return "negative";
    default: return null;
  }
}

/**
 * @param {string} cookieName
 * @param {any} value
 */
function setCookie(cookieName, value) {
  Cookies.set(cookieName, JSON.stringify(value));
}

/**
 * @param {string} cookieName
 * @param {any} defaultValue
 * @returns {any}
 */
function getOrDefaultCookie(cookieName, defaultValue) {
  try {
    const cookieContent = Cookies.get(cookieName);
    if (cookieContent == null) return defaultValue;
    return JSON.parse(cookieContent);
  } catch (err) {
    console.log(err);
    return defaultValue;
  }
}

/** @param {Mod[]} mods */
function sortMods(mods) {
  // Move vanilla to the top of the list
  const vanillaIndex = mods.findIndex(mod => mod.id === "Vanilla");
  mods.splice(0, 0, mods.splice(vanillaIndex, 1)[0]);
  // Loop through every mod in the list...
  for (let i = 0; i < mods.length; i ++) {
    // And then loop through every requirement in that mod...
    for (const req of mods[i].requires) {
      // If that requirement is after it, move it to before it and restart
      const reqIndex = mods.findIndex(mod => mod.id === req);
      if (reqIndex !== -1 && reqIndex > i) {
        mods.splice(i, 0, mods.splice(reqIndex, 1)[0]);
        i = 0;
        break;
      }
    }
  }
}

/**
 * @template {object} T
 * @param {T[]} objects
 * @returns {T}
 */
function mergeObjects(objects) {
  return Object.assign({}, ...objects);
}

/**
 * @param {Mod[]} mods
 * @returns {ModData}
 */
function mergeMods(mods) {
  const ids = new Set(mods.map(mod => mod.id));
  const mutualExclusives = dedup(mods.flatMap(mod => mod.mutual_exclusives));
  const lang = mergeObjects(mods.map(mod => mod.lang));
  const traitsMerged = mergeObjects(mods.map(mod => mod.traits));
  const professionsMerged = mergeObjects(mods.map(mod => mod.professions));

  /** @type {Map<string, Trait>} */
  let traits = new Map();
  for (const id in traitsMerged) {
    const trait = traitsMerged[id];
    if (testCondition(trait.condition, ids)) {
      traits.set(id, convertTrait(id, trait, mutualExclusives, lang));
    }
  }

  /** @type {Map<string, Profession>} */
  let professions = new Map();
  for (const id in professionsMerged) {
    const profession = professionsMerged[id];
    if (testCondition(profession.condition, ids)) {
      professions.set(id, convertProfession(id, profession, traits, lang));
    }
  }

  return { ids, traits, professions };
}

/**
 * @param {string} id
 * @param {TraitBase} trait
 * @param {[string, string][]} mutualExclusives
 * @param {{ [n: string]: string }} lang
 * @returns {Trait}
 */
function convertTrait(id, trait, mutualExclusives, lang) {
  let exclusives = new Set();
  for (const [id1, id2] of mutualExclusives) {
    if (id1 === id) exclusives.add(id2);
    if (id2 === id) exclusives.add(id1);
  };

  return {
    id,
    name: lang[trait.name_key] || null,
    description: lang[trait.description_key] || null,
    icon: trait.icon_path,
    cost: trait.cost,
    isProfessionTrait: trait.is_profession_trait || false,
    isSleepTrait: trait.is_sleep_trait || false,
    isDisabledInMp: trait.is_disabled_in_mp || false,
    xpBoosts: trait.xp_boosts || {},
    freeRecipes: trait.free_recipes || [],
    exclusives
  };
}

/**
 * @param {string} id
 * @param {ProfessionBase} profession
 * @param {Map<string, Trait>} traits
 * @param {{ [n: string]: string }} lang
 * @returns {Profession}
 */
function convertProfession(id, profession, traits, lang) {
  return {
    id,
    name: lang[profession.name_key] || null,
    description: lang[profession.description_key] || null,
    icon: profession.icon_path,
    points: profession.points,
    xpBoosts: profession.xp_boosts || {},
    freeRecipes: profession.free_recipes || [],
    freeTraits: (profession.free_traits || []).filter(t => traits.has(t))
  };
}

/**
 * @param {object|null} condition
 * @param {Set<string>} ids
 * @return {boolean}
 */
function testCondition(condition, ids) {
  switch (true) {
    case condition == null: return true;
    case Array.isArray(condition.all):
      return condition.all.every(c => testCondition(c, ids));
    case Array.isArray(condition.any):
      return !condition.all.every(c => !testCondition(c, ids));
    case condition.mod_is_present != null:
      return ids.has(condition.mod_is_present);
    case condition.mod_is_absent != null:
      return !ids.has(condition.mod_is_absent);
    default: throw new TypeError("Invalid condition");
  }
}

/**
 * @template T
 * @param {Set<T>} set
 * @param {(value: T) => bool} predicate
 * @returns {Set<T>}
 */
function filterSet(set, predicate) {
  return new Set(Array.from(set.values()).filter(predicate));
}

function clamp(min, max, value) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @template T
 * @param {T[]} array
 * @return {T[]}
 */
function dedup(array) {
  return [...new Set(array)];
}

/**
 * @param {string} str
 * @return {string}
 */
function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

async function fetchJSON(path) {
  const response = await window.fetch(path);
  return await response.json();
}

function link(workshop) {
  return `https://steamcommunity.com/sharedfiles/filedetails?id=${workshop}`;
}

/**
 * @typedef {object} Mod
 * @property {string} id
 * @property {string} name
 * @property {boolean} enabled
 * @property {string} author
 * @property {string[]} requires
 * @property {string[]} incompatible
 * @property {integer} workshop_id
 * @property {{ [n: string]: TraitBase }?} traits
 * @property {{ [n: string]: ProfessionBase }?} professions
 * @property {[string, string][]?} mutual_exclusives
 * @property {{ [n: string]: string }?} lang
 */

/**
 * @typedef {object} ModData
 * @property {Set<string>} ids
 * @property {Map<string, Trait>} traits
 * @property {Map<string, Profession>} professions
 */

/**
 * @typedef {object} TraitBase
 * @property {string} name_key
 * @property {string} description_key
 * @property {string?} icon_path
 * @property {integer} cost
 * @property {boolean?} is_profession_trait
 * @property {boolean?} is_sleep_trait
 * @property {boolean?} is_disabled_in_mp
 * @property {{ [n: string]: integer }?} xp_boosts
 * @property {string[]?} free_recipes
 * @property {object?} condition
 */

/**
 * @typedef {object} Trait
 * @property {string} id
 * @property {string?} name
 * @property {string?} description
 * @property {string?} icon
 * @property {integer} cost
 * @property {boolean} isProfessionTrait
 * @property {boolean} isSleepTrait
 * @property {boolean} isDisabledInMp
 * @property {{ [n: string]: integer }} xpBoosts
 * @property {string[]} freeRecipes
 * @property {Set<string>} exclusives
 */

/**
 * @typedef {object} ProfessionBase
 * @property {string} name_key
 * @property {string?} description_key
 * @property {string?} icon_path
 * @property {integer} points
 * @property {{ [n: string]: integer }?} xp_boosts
 * @property {string[]?} free_recipes
 * @property {string[]?} free_traits
 * @property {object?} condition
 */

/**
 * @typedef {object} Profession
 * @property {string} id
 * @property {string?} name
 * @property {string?} description
 * @property {string?} icon
 * @property {integer} points
 * @property {{ [n: string]: integer }} xpBoosts
 * @property {string[]} freeRecipes
 * @property {string[]} freeTraits
 */
