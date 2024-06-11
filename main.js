"use strict";

const BASE = (window.location.origin + window.location.pathname).replace(/index\.html$/i, "");

const DEFAULT_PROFESSION = "unemployed";
const DEFAULT_MOD_URLS = [
  "#/data/Vanilla.json",
  "#/data/HephasOccupationsAndTraits.json",
  "#/data/HephasOccupationsAndTraits_WithVanillaProfessions.json",
  "#/data/MoreDescriptionForTraits4166.json",
  "#/data/MoreSimpleTraits.json",
  "#/data/MoreSimpleTraitsMini.json",
  "#/data/MoreSimpleTraitsVanilla.json",
  "#/data/ScottyInjuryTraits.json",
  "#/data/ScottyMoreTraits.json",
  "#/data/SimpleOverhaulTraitsAndOccupations.json",
  "#/data/ToadTraits.json",
  "#/data/ToadTraitsDisablePrepared.json",
  "#/data/ToadTraitsDisableSpec.json",
  "#/data/ToadTraitsDynamic.json"
];

/** @type {Map<string, string>} */
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

$(window).on("load", function () {
  reload(DEFAULT_MOD_URLS);

  $(window).on("keydown", function (event) {
    if (event.key === "Escape") {
      $("#planner-overlay").addClass("hide").empty();
    }
  });

  $("#setting-is-multiplayer").on("change", function () {
    if (State.instance == null) return;
    const state = State.get();
    state.preset.settings.isMultiplayer = this.checked;
    // update is required to filter out now-unavailable chosen traits
    state.update();
    state.rebuildInterfaceTraitsProfessions();
    state.save();
  });

  $("#setting-is-sleep-enabled").on("change", function () {
    if (State.instance == null) return;
    const state = State.get();
    state.preset.settings.isSleepEnabled = this.checked;
    // update is required to filter out now-unavailable chosen traits
    state.update();
    state.rebuildInterfaceTraitsProfessions();
    state.save();
  });

  $("#setting-show-unavailable").on("change", function () {
    if (State.instance == null) return;
    const state = State.get();
    state.preset.settings.showUnavailable = this.checked;
    state.update();
    state.rebuildInterfaceTraitsProfessions();
    state.save();
  });

  $("#reset-build").on("click", function () {
    if (State.instance == null) return;
    const state = State.get();
    state.preset.reset();
    state.update();
    state.rebuildInterfaceTraitsProfessions();
    state.save();
  });
});

/** @param {string[]} modUrls */
async function reload(modUrls) {
  $("#planner-overlay").removeClass("hide").text("Loading...");
  const expandedModUrls = modUrls.map(expandLink);
  await Promise.all(expandedModUrls.map(fetchJSON))
    .then(modsLoadingSuccess, modsLoadingFailure);
}

/** @param {any[]} mods */
function modsLoadingSuccess(mods) {
  $("#planner-overlay").addClass("hide").empty();
  /** @type {Map<string, Mod>} */
  let loadedMods = new Map();
  for (let mod of mods) {
    mod.requires = mod.requires || [];
    mod.incompatible = mod.incompatible || [];
    loadedMods.set(mod.id, mod);
  }

  State.set(State.load(loadedMods));
  State.get().applySettingsVisual();
  State.get().rebuildInterfaceFull();
  State.get().save();
}

function modsLoadingFailure(error) {
  $("#planner-overlay").removeClass("hide").text(error.toString());
  console.log(error);
}

function linkAttr(workshopId) {
  return {
    href: steamWorkshopLink(workshopId),
    target: "_blank",
    rel: "noopener noreferrer"
  };
}

/** @param {Mod} mod */
function createModElement(mod) {
  const preset = State.get().preset;
  let modElement = $("<div>").addClass("planner-mod");

  const modAuthor = $("<span>").text(mod.author);
  const modNameLink = mod.workshop_id != null
    ? $("<a>").text(mod.name).attr(linkAttr(mod.workshop_id))
    : $("<span>").text(mod.name);
  const modName = $("<span>").append([modNameLink, " by ", modAuthor]);
  modElement.append(modName);

  if (mod.id === "Vanilla") {
    const modToggleButtonFake = $("<button>")
      .attr("disabled", true)
      .addClass("mod-enabled")
      .text("Always Enabled");
    modElement.append(modToggleButtonFake);
  } else {
    const isIncompatible = mod.incompatible.some(id => preset.isModEnabled(id));
    const modToggleButton = $("<button>")
      .addClass(isIncompatible ? "" : (preset.isModEnabled(mod.id) ? "mod-enabled" : "mod-disabled"))
      .text(isIncompatible ? "Incompatible" : (preset.isModEnabled(mod.id) ? "Enabled" : "Disabled"));
    if (isIncompatible) {
      modToggleButton.attr("disabled", true);
    } else {
      modToggleButton.on("click", function () {
        const state = State.get();
        state.toggleMod(mod.id);
        state.rebuildInterfaceFull();
        state.save();
      });
    }

    modElement.append(modToggleButton);
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
      $("<img>").addClass("planner-trait-icon").attr("src", expandLink(trait.icon))
    ] : []),
    $("<span>").text(trait.name)
  ]);

  const description = createDescription(trait.description, trait.xpBoosts);
  traitElement.attr("title", description);

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
        state.update();
        state.rebuildInterfaceTraitsProfessions();
        state.save();
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
      $("<img>").addClass("planner-profession-icon").attr("src", expandLink(profession.icon))
    ] : []),
    $("<span>").text(profession.name)
  ]);

  const description = createDescription(profession.description, profession.xpBoosts, profession.points);
  professionElement.attr("title", description);

  if (state.preset.profession === profession.id) {
    professionElement.addClass("selected");
  }

  professionElement.append(professionNameElement);
  professionElement.on("click", function () {
    const state = State.get();
    state.selectProfession(profession);
    //state.preset.profession = profession.id;
    state.update();
    state.rebuildInterfaceTraitsProfessions();
    state.save();
  });

  return professionElement;
}

class State {
  /**
   * @param {Map<string, Mod>} loadedMods
   * @param {Preset} preset
   * @param {Map<string, Preset>} presets
   */
  constructor(loadedMods, preset = new Preset()) {
    if (!(preset instanceof Preset)) preset = new Preset(preset);

    /** @type {Map<string, Mod>} */
    this.loadedMods = loadedMods;

    /** @type {ModData} */
    this.currentModData = getEnabledModData(loadedMods, preset.enabledMods);

    /** @type {Preset} */
    this.preset = preset;
  }

  update() {
    this.currentModData = getEnabledModData(this.loadedMods, this.preset.enabledMods);
    this.preset.filter(this.currentModData, trait => this.isTraitAvailable(trait));
  }

  rebuildInterfaceFull() {
    this.update();
    this.rebuildInterfaceTraitsProfessions();
    this.rebuildInterfaceMods();
  }

  rebuildInterfaceTraitsProfessions() {
    const availableProfessions = this.getAvailableProfessions();

    const availableTraits = this.getAvailableTraits();
    availableTraits.sort((trait1, trait2) => trait1.cost - trait2.cost);
    const availableNonChosenTraits = availableTraits.filter(trait => !this.preset.traits.has(trait.id));
    const positiveTraits = availableNonChosenTraits.filter(trait => !trait.isProfessionTrait && trait.cost > 0);
    const negativeTraits = availableNonChosenTraits.filter(trait => !trait.isProfessionTrait && trait.cost < 0);
    negativeTraits.sort((trait1, trait2) => trait2.cost - trait1.cost);
    const chosenTraits = availableTraits.filter(trait => this.isTraitChosen(trait.id));

    $("#panel-professions > div.panel-inner").empty().append(availableProfessions.map(createProfessionElement));
    $("#panel-traits-positive > div.panel-inner").empty().append(positiveTraits.map(createTraitElement));
    $("#panel-traits-negative > div.panel-inner").empty().append(negativeTraits.map(createTraitElement));
    $("#panel-traits-chosen > div.panel-inner").empty().append(chosenTraits.map(createTraitElement));
    const skillsElement = $("#panel-major-skills > div.panel-inner").empty();

    const skills = this.getSkills();
    for (const skill of SKILL_NAMES.keys()) {
      if (skills.has(skill) && (skills.get(skill) !== 0 || skill === "Fitness" || skill === "Strength")) {
        skillsElement.append(createSkillElement(skill, skills.get(skill)));
      }
    }

    setPoints(this.getPointTotal());
  }

  rebuildInterfaceMods() {
    const loadedMods = Array.from(this.loadedMods.values());
    $("#planner-mods-list").empty().append(loadedMods.map(createModElement));
  }

  applySettingsVisual() {
    // Set the settings checkboxes to whatever settings this state holds
    $("#setting-is-multiplayer").prop("checked", this.preset.settings.isMultiplayer);
    $("#setting-is-sleep-enabled").prop("checked", this.preset.settings.isSleepEnabled);
    $("#setting-show-unavailable").prop("checked", this.preset.settings.showUnavailable);
  }

  /** @returns {integer} */
  getPointTotal() {
    const freePoints = this.preset.settings.freePoints;
    const currentProfession = this.currentModData.professions.get(this.preset.profession);
    let base = freePoints + (currentProfession != null ? currentProfession.points : 0);
    for (const id of this.preset.traits.values()) {
      base -= this.currentModData.traits.get(id).cost;
    }

    return base;
  }

  /** @returns {Trait[]} */
  getAvailableTraits() {
    const allTraits = Array.from(this.currentModData.traits.values());
    return this.preset.settings.showUnavailable ? allTraits
      : allTraits.filter(trait => this.isTraitAvailable(trait));
  }

  /** @returns {Profession[]} */
  getAvailableProfessions() {
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
      for (const [skill, boost] of trait.xpBoosts.entries()) {
        putXpBoost(skill, boost);
      }
    }

    const currentProfession = this.currentModData.professions.get(this.preset.profession);
    if (currentProfession != null) {
      for (const [skill, boost] of currentProfession.xpBoosts.entries()) {
        putXpBoost(skill, boost);
      }
    }

    return xpBoosts;
  }

  /** @returns {boolean} */
  isTraitChosen(id) {
    if (this.preset.traits.has(id)) return true;
    const trait = this.currentModData.traits.get(id);
    const currentProfession = this.currentModData.professions.get(this.preset.profession);
    // Mods can grant non-profession traits as "free traits" but they can still be deselected
    // I don't know if this is a bug, but parity with the game is important, so this enables this behavior
    return currentProfession != null && currentProfession.freeTraits.includes(id) && trait.isProfessionTrait;
  }

  /** @param {Trait} trait @returns {boolean} */
  isTraitAvailable(trait) {
    const currentProfession = this.currentModData.professions.get(this.preset.profession);
    if (!this.preset.settings.isSleepEnabled && trait.isSleepTrait) return false;
    if (this.preset.settings.isMultiplayer && trait.isDisabledInMp) return false;

    for (const id of trait.exclusives.values()) {
      if (this.preset.traits.has(id)) return false;
      if (currentProfession != null && currentProfession.freeTraits.includes(id)) return false;
    }

    return true;
  }

  /** @param {Profession} profession */
  selectProfession(profession) {
    this.preset.profession = profession.id;
    // As with the above, non-profession "free traits" can be deselected after the profession is selected
    // If a mod does this, we just enable the trait when you select the profession so that the
    // (potentially bugged?) behavior is replicated
    for (const id of profession.freeTraits) {
      const trait = this.currentModData.traits.get(id);
      if (!trait.isProfessionTrait) this.preset.traits.add(id);
    }
  }

  /** @param {Trait} trait */
  toggleTrait(trait) {
    if (this.preset.traits.has(trait.id)) {
      this.preset.traits.delete(trait.id);
    } else {
      this.preset.traits.add(trait.id);
    }
  }

  /** @param {string} id */
  toggleMod(id) {
    if (this.preset.enabledMods.has(id)) {
      this.disableMod(id);
    } else {
      this.enableMod(id);
    }
  }

  /** @param {string} id */
  enableMod(id) {
    this.preset.enabledMods.add(id);
    const mod = this.loadedMods.get(id);
    if (mod == null) return;
    for (const requirement of mod.requires) {
      this.enableMod(requirement);
    }
  }

  /** @param {string} id */
  disableMod(id) {
    this.preset.enabledMods.delete(id);
    for (const otherMod of this.loadedMods.values()) {
      if (otherMod.requires.includes(id)) {
        this.disableMod(otherMod.id);
      }
    }
  }

  /** @param {Map<string, Mod>} loadedMods */
  static load(loadedMods) {
    if (window.location.search.length !== 0) {
      return new State(loadedMods, Preset.fromURLParams(window.location.search, loadedMods));
    } else {
      return new State(loadedMods, Preset.loadFromCookies());
    }
  }

  save() {
    const url = new URL(window.location.href);
    url.search = "?" + this.preset.toURLParams().toString();
    window.history.replaceState(null, null, url);
    this.preset.saveToCookies();
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

class Preset {
  constructor({
    enabledMods = new Set(),
    settings = new Settings(),
    profession = null,
    traits = new Set(),
  } = {}) {
    if (!(enabledMods instanceof Set)) enabledMods = new Set(enabledMods);
    if (!(settings instanceof Settings)) settings = new Settings(settings);
    if (!(traits instanceof Set)) traits = new Set(traits);

    /** @type {Set<string>} */
    this.enabledMods = enabledMods;
    /** @type {Settings} */
    this.settings = settings;
    /** @type {string?} */
    this.profession = profession;
    /** @type {Set<string>} */
    this.traits = traits;
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  isModEnabled(id) {
    return id === "Vanilla" || this.enabledMods.has(id);
  }

  reset() {
    this.profession = null;
    this.traits = new Set();
  }

  /**
   * @param {ModData} modData
   * @param {(trait: Trait) => boolean} predicate
   */
  filter(modData, predicate) {
    if (!modData.professions.has(this.profession)) this.profession = null;
    if (this.profession == null && modData.professions.has(DEFAULT_PROFESSION)) this.profession = DEFAULT_PROFESSION;
    this.traits = filterSet(this.traits, id => modData.traits.has(id) && predicate(modData.traits.get(id)));
  }

  /**
   * @param {URLSearchParams | string} urlParams
   * @param {Map<string, Mod>} loadedMods
   * @returns {Preset}
   */
  static fromURLParams(urlParams, loadedMods) {
    /** @type {Map<integer, string>} */
    const loadedModShortcuts = new Map();
    for (const [id, mod] of loadedMods) {
      loadedModShortcuts.set(mod.shortcut, id);
    }

    if (typeof urlParams === "string") urlParams = new URLSearchParams(urlParams);
    const settingsList = urlParams.has("s") ? splitWhitespace(urlParams.get("s")).map(parseShortBoolean) : [];
    const enabledModShortcuts = urlParams.has("m") ? splitWhitespace(urlParams.get("m")).map(i => parseInt(i, 10)) : [];
    const professionShortcut = urlParams.has("o") ? parseInt(urlParams.get("o"), 10) : null;
    const traitShortcuts = urlParams.has("t") ? splitWhitespace(urlParams.get("t")).map(i => parseInt(i, 10)) : [];

    const enabledMods = new Set(enabledModShortcuts.map(id => loadedModShortcuts.get(id)).filter(value => value != null));
    const modData = getEnabledModData(loadedMods, enabledMods);

    const profession = modData.shortcuts.professions.get(professionShortcut) || null;
    const traits = traitShortcuts.map(id => modData.shortcuts.traits.get(id)).filter(value => value != null);

    return new Preset({
      settings: Settings.fromArray(settingsList),
      enabledMods, profession, traits
    });
  }

  /** @returns {URLSearchParams} */
  toURLParams() {
    const state = State.get();
    const enabledMods = Array.from(this.enabledMods.values());
    const profession = state.currentModData.professions.get(this.profession);
    const traits = Array.from(this.traits.values());
    let urlParams = new URLSearchParams();

    urlParams.set("s", this.settings.toArray().map(b => b ? "t" : "f").join(" "));
    if (enabledMods.length !== 0) urlParams.set("m", enabledMods.map(id => state.loadedMods.get(id).shortcut).join(" "));
    if (profession != null) urlParams.set("o", profession.shortcut);
    if (traits.length !== 0) urlParams.set("t", traits.map(id => state.currentModData.traits.get(id).shortcut).join(" "));
    return urlParams;
  }

  static loadFromCookies() {
    return new Preset(getOrDefaultCookie("saved_preset", {}));
  }

  saveToCookies() {
    setCookie("saved_preset", {
      settings: this.settings,
      enabledMods: Array.from(this.enabledMods.values()),
      profession: this.profession,
      traits: Array.from(this.traits.values()),
    });
  }
}

/**
 * @param {Map<string, Mod>} loadedMods
 * @param {Set<string>} enabledMods
 * @returns {ModData}
 */
function getEnabledModData(loadedMods, enabledMods) {
  let mods = Array.from(loadedMods.values())
    .filter(mod => mod.id === "Vanilla" || enabledMods.has(mod.id));
  sortMods(mods);
  return mergeMods(mods);
}

class Settings {
  constructor({
    isMultiplayer = false,
    isSleepEnabled = false,
    showUnavailable = false,
    freePoints = 0
  } = {}) {
    /** @type {boolean} */
    this.isMultiplayer = isMultiplayer;
    /** @type {boolean} */
    this.isSleepEnabled = isSleepEnabled;
    /** @type {boolean} */
    this.showUnavailable = showUnavailable;
    /** @type {integer} */
    this.freePoints = freePoints;
  }

  /** @param {[bool, bool, bool]?} array */
  static fromArray(array = []) {
    return new Settings({
      isMultiplayer: array[0],
      isSleepEnabled: array[1],
      showUnavailable: array[2]
    });
  }

  toArray() {
    return [
      this.isMultiplayer,
      this.isSleepEnabled,
      this.showUnavailable
    ];
  }

  static loadFromCookies() {
    return new Settings(getOrDefaultCookie("saved_settings", {}));
  }

  saveToCookies() {
    setCookie("saved_settings", this);
  }
}

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

/** @param {string} str @returns {string[]} */
function splitWhitespace(str) {
  return str.trim().split(/\s+/g).filter(s => s.length !== 0);
}

/** @param {string} str @param {boolean} defaltValue @returns {boolean} */
function parseShortBoolean(str, defaultValue) {
  switch (str) {
    case "t": case "T": return true;
    case "f": case "F": return false;
    default: return defaultValue;
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
  const removeDefaultProfessions = mods.some(mod => mod.remove_default_professions || false);

  const ids = new Set(mods.map(mod => mod.id));
  const mutualExclusives = dedup(mods.flatMap(mod => mod.mutual_exclusives));
  const lang = mergeObjects(mods.map(mod => mod.lang));
  const traitsMerged = mergeObjects(mods.map(mod => mod.traits));
  const professionsMerged = mergeObjects(mods.map(mod => {
    return removeDefaultProfessions && mod.id == "Vanilla" ? [] : mod.professions;
  }));

  /** @type {Shortcuts} */
  let shortcuts = {
    mods: new Map(),
    traits: new Map(),
    professions: new Map()
  };

  for (const mod of mods) {
    if (shortcuts.mods.has(mod.shortcut))
      throw new Error(`Shortcut ID for mod ${mod.shortcut} already exists`);
    shortcuts.mods.set(mod.shortcut, mod.id);
  }

  /** @type {Map<string, Trait>} */
  let traits = new Map();
  for (const id in traitsMerged) {
    const trait = traitsMerged[id];
    if (shortcuts.traits.has(trait.shortcut))
      throw new Error(`Shortcut ID for trait ${trait.shortcut}`);
    shortcuts.traits.set(trait.shortcut, id);
    if (testCondition(trait.condition, ids)) {
      traits.set(id, convertTrait(id, trait, mutualExclusives, lang));
    }
  }

  /** @type {Map<string, Profession>} */
  let professions = new Map();
  for (const id in professionsMerged) {
    const profession = professionsMerged[id];
    if (shortcuts.professions.has(profession.shortcut))
      throw new Error(`Shortcut ID for profession ${profession.shortcut}`);
    shortcuts.professions.set(profession.shortcut, id);
    if (testCondition(profession.condition, ids)) {
      professions.set(id, convertProfession(id, profession, traits, lang));
    }
  }

  return {
    ids,
    traits,
    professions,
    shortcuts
  };
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
    shortcut: trait.shortcut,
    icon: trait.icon_path,
    cost: trait.cost,
    isProfessionTrait: trait.is_profession_trait || false,
    isSleepTrait: trait.is_sleep_trait || false,
    isDisabledInMp: trait.is_disabled_in_mp || false,
    xpBoosts: new Map(Object.entries(trait.xp_boosts || {})),
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
    shortcut: profession.shortcut,
    icon: profession.icon_path,
    points: profession.points,
    xpBoosts: new Map(Object.entries(profession.xp_boosts || {})),
    freeRecipes: profession.free_recipes || [],
    freeTraits: (profession.free_traits || []).filter(t => traits.has(t))
  };
}

/**
 * @param {string?} description
 * @param {Map<string, integer>} xpBoosts
 * @param {integer?} points
 * @returns {string}
 */
function createDescription(description, xpBoosts = new Map(), points = null) {
  let descriptionLines = (description || "").split(/\n+/g);

  if (points !== null && points !== undefined) {
    descriptionLines.push("");
    descriptionLines.push(points.toString() + " Starting Points");
  }

  if (xpBoosts.size > 0) descriptionLines.push("");
  for (const [skill, skillName] of SKILL_NAMES.entries()) {
    if (!xpBoosts.has(skill)) continue;
    const boost = xpBoosts.get(skill);
    const boostText = (boost < 0 ? "" : "+") + boost.toString();
    descriptionLines.push(boostText + " " + skillName);
  }

  return descriptionLines.join("\n").trim();
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

/** @param {string} link @returns {string} */
function expandLink(link) {
  if (link.startsWith("#")) {
    return BASE + link.replace(/^#\/*/, "");
  } else {
    return link;
  }
}

function steamWorkshopLink(workshop) {
  return `https://steamcommunity.com/sharedfiles/filedetails?id=${workshop}`;
}

/**
 * @typedef {object} Mod
 * @property {string} id
 * @property {string} name
 * @property {integer} shortcut
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
 * @property {Shortcuts} shortcuts
 */

/**
 * @typedef {object} Shortcuts
 * @property {Map<integer, string>} mods
 * @property {Map<integer, string>} traits
 * @property {Map<integer, string>} professions
 */

/**
 * @typedef {object} TraitBase
 * @property {string} name_key
 * @property {string} description_key
 * @property {integer} shortcut
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
 * @property {integer} shortcut
 * @property {string?} icon
 * @property {integer} cost
 * @property {boolean} isProfessionTrait
 * @property {boolean} isSleepTrait
 * @property {boolean} isDisabledInMp
 * @property {Map<string, integer>} xpBoosts
 * @property {string[]} freeRecipes
 * @property {Set<string>} exclusives
 */

/**
 * @typedef {object} ProfessionBase
 * @property {string} name_key
 * @property {string?} description_key
 * @property {integer} shortcut
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
 * @property {integer} shortcut
 * @property {string?} icon
 * @property {integer} points
 * @property {Map<string, integer>} xpBoosts
 * @property {string[]} freeRecipes
 * @property {string[]} freeTraits
 */
