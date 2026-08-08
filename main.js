"use strict";

const BASE = (window.location.origin + window.location.pathname).replace(/\/*(?:index\.html)?$/i, "") + "/";

const DEFAULT_PROFESSION = "unemployed";
const DATA_MANIFEST_URL = "#/data_manifest.json";
const DATA_MANIFEST_CONTENTS_ROOT = "#/data";

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
  reload();

  $(window).on("keydown", function (event) {
    if (event.key === "Escape") hideOverlay();
  });

  $("#setting-is-multiplayer").on("change", function () {
    const state = State.get();

    state.preset.settings.isMultiplayer = this.checked;
    state.update();
    state.rebuildInterfaceTraitsProfessions();
    state.save();
  });

  $("#setting-is-sleep-enabled").on("change", function () {
    const state = State.get();

    state.preset.settings.isSleepEnabled = this.checked;
    state.update();
    state.rebuildInterfaceTraitsProfessions();
    state.save();
  });

  $("#setting-show-unavailable").on("change", function () {
    const state = State.get();

    state.preset.settings.showUnavailable = this.checked;
    //state.update();
    state.rebuildInterfaceTraitsProfessions();
    state.save();
  });

  $("#reset-build").on("click", function () {
    const state = State.get();

    state.selectedPresetName = null;
    state.preset.reset();
    state.update();
    state.rebuildInterfacePresets();
    state.rebuildInterfaceTraitsProfessions();
    state.save();
  });

  $("#presets-selector").on("change", function () {
    const state = State.get();

    const presetName = this.value;
    if (state.presets.has(presetName)) {
      state.selectedPresetName = presetName;
      state.preset = state.presets.get(presetName).clone();
      state.update();
      state.applySettingsVisual();
      state.rebuildInterfaceFull();
      state.save();
    }
  })

  $("#presets-save").on("click", function () {
    const state = State.get();

    const defaultName = state.selectedPresetName || undefined;
    const presetName = window.prompt("Enter a name for this preset", defaultName);
    if (presetName != null) {
      state.selectedPresetName = presetName;
      state.presets.set(presetName, state.preset.clone());
      state.update();
      state.rebuildInterfacePresets();
      state.save();
    }
  });

  $("#presets-delete").on("click", function () {
    const state = State.get();

    if (state.presets.has(state.selectedPresetName)) {
      if (window.confirm(`Are you sure you want to delete the preset "${state.selectedPresetName}"?`)) {
        state.presets.delete(state.selectedPresetName);
        state.selectedPresetName = null;
        state.update();
        state.rebuildInterfacePresets();
        state.save();
      }
    }
  });
});

function showOverlay(text = "Loading...") {
  $("#planner-overlay").removeClass("hide").text(text);
}

function hideOverlay() {
  $("#planner-overlay").addClass("hide").empty();
}

/** @param {string} url @returns {string} */
function expandUrl(url) {
  if (url.startsWith("#")) {
    return BASE + url.replace(/^#\/*/, "");
  } else {
    return url;
  }
}

async function reload() {
  showOverlay();
  await loadAndValidateMods()
    .then(modsLoadingSuccess, modsLoadingFailure);
}

/** @param {string} url @returns {Promise<string[]>} */
async function loadDataManifest() {
  const dataManifestUrl = expandUrl(DATA_MANIFEST_URL);
  try {
    return await fetchJSON(dataManifestUrl);
    return urls;
  } catch (error) {
    throw new Error(`Failed to load ${url}: ${error}`);
  }
}

/** @returns {Promise<string[]>} */
async function loadAndValidateMods() {
  const urls = await loadDataManifest();
  const mods = await Promise.all(urls.map(loadAndValidateMod));
  return mods;
}

/** @param {string} url @returns {Promise<Mod>} */
async function loadAndValidateMod(url) {
  const expandedUrl = expandUrl(url);
  try {
    const raw = await fetchJSON(expandedUrl);
    return new Mod(raw);
  } catch (error) {
    throw new Error(`Failed to load ${url}: ${error}`);
  }
}

async function fetchJSON(url) {
  const response = await window.fetch(url);
  if (!response.ok) throw new Error(`Response status: ${response.status}`);
  return await response.json();
}

/** @param {Mod[]} mods */
function modsLoadingSuccess(mods) {
  hideOverlay();
  /** @type {Map<string, Mod>} */
  let loadedMods = new Map();
  for (const mod of mods) {
    loadedMods.set(mod.id, mod);
  }

  const state = State.set(State.load(loadedMods));
  state.applySettingsVisual();
  state.rebuildInterfaceFull();
  state.save();
}

function modsLoadingFailure(error) {
  showOverlay(error.toString());
  console.error(error);
}

function steamWorkshopLinkAttr(workshopId) {
  return {
    href: steamWorkshopLink(workshopId),
    target: "_blank",
    rel: "noopener noreferrer"
  };
}

function steamWorkshopLink(workshop) {
  return `https://steamcommunity.com/sharedfiles/filedetails?id=${workshop}`;
}

/** @param {Mod} mod */
function createModElement(mod) {
  const preset = State.get().preset;
  let modElement = $("<div>").addClass("planner-mod");

  const modAuthor = $("<span>").text(mod.author);
  const modNameLink = mod.workshopId != null
    ? $("<a>").text(mod.name).attr(steamWorkshopLinkAttr(mod.workshopId))
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
      .addClass(isIncompatible ? "mod-incompatible" : (preset.isModEnabled(mod.id) ? "mod-enabled" : "mod-disabled"))
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
  // According to the wiki (https://pzwiki.net/wiki/Skill#Starting_skill_levels)
  // strength and fitness are not affected by the skill xp boost system
  const skillGetsXpBoost = !(skill === "Strength" || skill === "Fitness");
  const xpBoostText = skillGetsXpBoost ? getXpBoostText(boost) : null;
  const xpBoostMultiplierText = skillGetsXpBoost
    ? `This skill receives an effective XP gain multiplier of ${getXpBoostMultiplierText(boost)}.`
    : "This skill receives no XP boosts.";
  const skillXpBoostElement = $("<span>").addClass("skill-xp-boost").text(xpBoostText || "");
  return $("<div>").addClass("planner-skill").attr("title", xpBoostMultiplierText).append([
    skillNameElement, skillLevelElement, skillLevelBarElement, skillXpBoostElement
  ]);
}

/** @param {TraitResolved} trait */
function createTraitElement(trait) {
  const state = State.get();
  let traitElement = $("<div>").addClass("planner-trait");
  let traitNameElement = $("<div>").addClass("planner-trait-name").append([
    $("<div>").addClass("planner-trait-icon-container").append(trait.icon ? [
      $("<img>").addClass("planner-trait-icon").attr("src", expandUrl(trait.icon))
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

/** @param {ProfessionResolved} profession */
function createProfessionElement(profession) {
  const state = State.get();
  let professionElement = $("<div>").addClass("planner-profession");
  let professionNameElement = $("<div>").addClass("planner-profession-name");
  professionNameElement.append([
    $("<div>").addClass("planner-profession-icon-container").append(profession.icon ? [
      $("<img>").addClass("planner-profession-icon").attr("src", expandUrl(profession.icon))
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
    state.update();
    state.rebuildInterfaceTraitsProfessions();
    state.save();
  });

  return professionElement;
}

/**
 * @param {string} name
 * @param {boolean} selected
 */
function createPresetOptionElement(name, selected = false) {
  let attrs = { "value": name };
  if (selected) attrs["selected"] = true;
  return $("<option>").attr(attrs).text(name);
}

/**
 * @param {boolean} selected
 */
function createPresetOptionElementPlaceholder(selected = false) {
  let attrs = { "hidden": true, "disabled": true };
  if (selected) attrs["selected"] = true;
  return $("<option>").attr(attrs);
}

class State {
  /**
   * @param {Map<string, Mod>} loadedMods
   * @param {Preset} preset
   * @param {Map<string, Preset>} presets
   */
  constructor(loadedMods, preset = new Preset(), presets = new Map()) {
    if (!(preset instanceof Preset)) preset = new Preset(preset);
    if (!(presets instanceof Map)) presets = new Map(Object.entries(presets));

    /** @type {Map<string, Mod>} */
    this.loadedMods = loadedMods;

    /** @type {ModData} */
    this.currentModData = getEnabledModData(loadedMods, preset.enabledMods);

    /** @type {string?} */
    this.selectedPresetName = null;

    /** @type {Preset} */
    this.preset = preset;

    /** @type {Map<string, Preset>} */
    this.presets = presets;

    this.filter();
  }

  update() {
    this.currentModData = getEnabledModData(this.loadedMods, this.preset.enabledMods);
    this.filter();
  }

  filter() {
    this.preset.filter(this.currentModData, trait => this.isTraitAvailable(trait));
  }

  rebuildInterfaceFull() {
    this.update();
    this.rebuildInterfaceTraitsProfessions();
    this.rebuildInterfacePresets();
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

  rebuildInterfacePresets() {
    const presetOptions = Array.from(this.presets.keys())
      .map(name => createPresetOptionElement(name, name === this.selectedPresetName));
    const presetOptionPlaceholder = createPresetOptionElementPlaceholder(!this.presets.has(this.selectedPresetName));
    $("#presets-selector").empty().append([presetOptionPlaceholder, ...presetOptions]);
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

  /** @returns {TraitResolved[]} */
  getAvailableTraits() {
    const allTraits = Array.from(this.currentModData.traits.values());
    return this.preset.settings.showUnavailable ? allTraits
      : allTraits.filter(trait => this.isTraitAvailable(trait));
  }

  /** @returns {ProfessionResolved[]} */
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

  /** @param {TraitResolved} trait @returns {boolean} */
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

  /** @param {ProfessionResolved} profession */
  selectProfession(profession) {
    this.preset.profession = profession.id;
    // As stated above, non-profession "free traits" can be deselected after the profession is selected
    // If a mod does this, we just enable the trait when you select the profession so that the
    // (potentially bugged?) behavior is replicated
    for (const id of profession.freeTraits) {
      const trait = this.currentModData.traits.get(id);
      if (!trait.isProfessionTrait) this.preset.traits.add(id);
    }
  }

  /** @param {TraitResolved} trait */
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
    const preset = window.location.search.length !== 0
      ? Preset.fromURLParams(window.location.search, loadedMods)
      : Preset.loadFromCookiesSavedPreset();
    const presets = Preset.loadFromCookiesSavedPresets();
    return new State(loadedMods, preset, presets);
  }

  save() {
    const url = new URL(window.location.href);
    url.search = "?" + this.preset.toURLParams().toString();
    window.history.replaceState(null, null, url);
    Preset.saveToCookiesSavedPreset(this.preset);
    Preset.saveToCookiesSavedPresets(this.presets);
  }

  /**
   * @param {State} state
   * @returns {State}
   */
  static set(state) {
    State.instance = state;
    return state;
  }

  /** @returns {State} */
  static get() {
    if (State.instance == null) {
      throw new Error("no state");
    } else {
      return State.instance;
    }
  }

  static instance = null;
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

  clone() {
    return new Preset({
      enabledMods: new Set(this.enabledMods),
      settings: this.settings.clone(),
      profession: this.profession,
      traits: new Set(this.traits)
    });
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

  toObject() {
    return {
      settings: this.settings,
      enabledMods: Array.from(this.enabledMods.values()),
      profession: this.profession,
      traits: Array.from(this.traits.values()),
    };
  }

  /** @returns {Preset} */
  static loadFromCookiesSavedPreset() {
    return new Preset(getOrDefaultCookie("saved_preset", {}));
  }

  /** @returns {Map<string, Preset>} */
  static loadFromCookiesSavedPresets() {
    const mapEntries = ([key, object]) => [key, new Preset(object)];
    return new Map(Object.entries(getOrDefaultCookie("saved_presets", {})).map(mapEntries));
  }

  /** @param {Preset} preset */
  static saveToCookiesSavedPreset(preset) {
    setCookie("saved_preset", preset.toObject());
  }

  /** @param {Map<string, Preset>} presets */
  static saveToCookiesSavedPresets(presets) {
    const mapEntries = ([name, preset]) => [name, preset.toObject()];
    setCookie("saved_presets", Object.fromEntries(Array.from(presets.entries()).map(mapEntries)));
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
  return Mod.merge(mods);
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

  clone() {
    return new Settings(this);
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
  if (boost < 0) return null;
  switch (boost) {
    case 0: return "+25%";
    case 1: return "+75%";
    case 2: return "+100%";
    case 3: return "+125%";
    default: return "+125%";
  }
}

/**
 * @param {integer} boost
 * @returns {string?}
 */
function getXpBoostMultiplierText(boost) {
  if (boost < 0) return null;
  switch (boost) {
    case 0: return "1.00x";
    case 1: return "4.00x";
    case 2: return "5.32x";
    case 3: return "6.64x";
    default: return "6.64x";
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
    console.error(err);
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

/** @param {string} str @param {boolean} defaltValue @returns {boolean} */
function parseShortBoolean(str, defaultValue) {
  switch (str) {
    case "t": case "T": return true;
    case "f": case "F": return false;
    default: return defaultValue;
  }
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

class Validator {
  /**
   * @param {string|string[]|Set<string>} typeName
   * @param {(value: any, type: string) => any} validatorFunction
   * @param {boolean} optionalProperty
   */
  constructor(typeName, validatorFunction = function () {}, optionalProperty = false) {
    /** @type {Set<string>} */
    this.typeName = typeName instanceof Set ? typeName
      : new Set(Array.isArray(typeName) ? typeName : [typeName]);
    /** @type {(value: any, type: string) => any} */
    this.validatorFunction = validatorFunction;
    /** @type {boolean} */
    this.optionalProperty = optionalProperty;
  }

  static isString = Validator.isType("string");
  static isNumber = Validator.isType("number");
  static isBoolean = Validator.isType("boolean");
  static isArray = Validator.isType("array");
  static isObject = Validator.isType("object");

  /** @param {string|string[]} typeName */
  static isType(typeName) {
    return new Validator(typeName);
  }

  /** @param {(Validator|null)[]} entryValidators */
  static isArrayTuple(entryValidators) {
    return new Validator("array", function (array) {
      if (array.length !== entryValidators.length) {
        throw new TypeError(`Expected value of type array with length ${entryValidators.length}, found length ${array.length}`);
      }

      for (let i = 0; i < entryValidators.length; i ++) {
        if (!entryValidators[i]) continue;
        entryValidators[i].apply(array[i]);
      }
    });
  }

  /** @param {Validator?} entryValidator */
  static isArrayList(entryValidator) {
    return new Validator("array", function (array) {
      if (!entryValidator) return;
      for (const value of array) {
        entryValidator.apply(value);
      }
    });
  }

  /** @param {{ [field: string]: Validator? }} fieldValidators */
  static isObjectStruct(fieldValidators) {
    return new Validator("object", function (object) {
      for (const [key, validator] of Object.entries(fieldValidators)) {
        if (!validator) continue;
        if (object.hasOwnProperty(key)) {
          validator.apply(object[key]);
        } else if (!validator.optionalProperty) {
          throw new TypeError(`Expected value of type object with field '${key}' of type (${validator.typeNameText()})`);
        }
      }
    });
  }

  /** @param {Validator?} fieldValidator */
  static isObjectMap(fieldValidator) {
    return new Validator("object", function (object) {
      if (!fieldValidator) return;
      for (const value of Object.values(object)) {
        fieldValidator.apply(value);
      }
    });
  }

  /** @returns {Validator} */
  asOptionalProperty() {
    return new Validator(this.typeName, this.validatorFunction, true);
  }

  /**
   * @param {any} value
   * @returns {any}
   */
  apply(value) {
    const actualType = typeDetect(value).toLowerCase();
    if (!this.typeName.has(actualType)) {
      throw new TypeError(`Expected value of type (${this.typeNameText()}), found value of type (${actualType})`);
    } else if (this.validatorFunction) {
      return (this.validatorFunction)(value, actualType);
    }
  }

  /** @returns {string} */
  typeNameText() {
    const typeNameList = Array.from(this.typeName.values());
    switch (typeNameList.length) {
      case 0: return "nothing";
      case 1: return typeNameList[0];
      default: return `${typeNameList.slice(0, -1).join(", ")} or ${typeNameList[typeNameList.length - 1]}`;
    }
  }
}

class Condition {
  constructor(value) {
    const validatorOutput = Condition.validator.apply(value);
    if (typeof validatorOutput === "boolean") {
      this.variant = "static";
      /** @type {boolean} */
      this.value = validatorOutput;
    } else if (value.hasOwnProperty("any")) {
      this.variant = "any";
      /** @type {Condition[]} */
      this.conditions = Array.prototype.map.call(value.any, (value) => new Condition(value));
    } else if (value.hasOwnProperty("all")) {
      this.variant = "all";
      /** @type {Condition[]} */
      this.conditions = Array.prototype.map.call(value.all, (value) => new Condition(value));
    } else if (value.hasOwnProperty("mod_is_present")) {
      this.variant = "mod_is_present";
      /** @type {string} */
      this.mod = value.mod_is_present;
    } else if (value.hasOwnProperty("mod_is_absent")) {
      this.variant = "mod_is_absent";
      /** @type {string} */
      this.mod = value.mod_is_absent;
    } else {
      throw new TypeError("Invalid object");
    }
  }

  /** @param {Set<string>} modList */
  test(modList) {
    switch (this.variant) {
      case "static": return this.value;
      case "any": return this.conditions.some((condition) => condition.test(modList));
      case "all": return this.conditions.every((condition) => condition.test(modList));
      case "mod_is_present": return modList.has(this.mod);
      case "mod_is_absent": return !modList.has(this.mod);
      default: throw new Error("Invalid condition");
    }
  }

  static validatorObject = Validator.isObjectStruct({
    "any": Validator.isArray.asOptionalProperty(),
    "all": Validator.isArray.asOptionalProperty(),
    "mod_is_present": Validator.isString.asOptionalProperty(),
    "mod_is_absent": Validator.isString.asOptionalProperty()
  });

  static validator = new Validator(["null", "boolean", "object"], function (value, type) {
    switch (type) {
      case "null": return true;
      case "boolean": return value;
      case "object":
        Condition.validatorObject.apply(value);
        return null;
      default: throw new Error("Unreachable");
    }
  });
}

class Trait {
  /**
   * @param {string} id
   * @param {TraitBase} object
   */
  constructor(id, object) {
    Trait.validator.apply(object);

    /** @type {string} */
    this.id = id;
    /** @type {string} */
    this.nameKey = object.name_key;
    /** @type {string} */
    this.descriptionKey = object.description_key;
    /** @type {number} */
    this.shortcut = object.shortcut;
    /** @type {string?} */
    this.iconPath = object.hasOwnProperty("icon_path") ? object.icon_path : null;
    /** @type {number} */
    this.cost = object.cost;
    /** @type {boolean} */
    this.isProfessionTrait = object.hasOwnProperty("is_profession_trait") ? object.is_profession_trait : false;
    /** @type {boolean} */
    this.isSleepTrait = object.hasOwnProperty("is_sleep_trait") ? object.is_sleep_trait : false;
    /** @type {boolean} */
    this.isDisabledInMp = object.hasOwnProperty("is_disabled_in_mp") ? object.is_disabled_in_mp : false;
    /** @type {Map<string, number>} */
    this.xpBoosts = object.hasOwnProperty("xp_boosts") ? new Map(Object.entries(object.xp_boosts)) : new Map();
    /** @type {string[]} */
    this.freeRecipes = object.hasOwnProperty("free_recipes") ? object.free_recipes : [];
    /** @type {Condition?} */
    this.condition = object.hasOwnProperty("condition") ? new Condition(object.condition) : null;
  }

  static validator = Validator.isObjectStruct({
    "name_key": Validator.isString,
    "description_key": Validator.isString,
    "shortcut": Validator.isNumber,
    "icon_path": Validator.isType(["null", "string"]).asOptionalProperty(),
    "cost": Validator.isNumber,
    "is_profession_trait": Validator.isBoolean.asOptionalProperty(),
    "is_sleep_trait": Validator.isBoolean.asOptionalProperty(),
    "is_disabled_in_mp": Validator.isBoolean.asOptionalProperty(),
    "xp_boosts": Validator.isObjectMap(Validator.isNumber).asOptionalProperty(),
    "free_recipes": Validator.isArrayList(Validator.isString).asOptionalProperty(),
    "condition": null
  });
}

class TraitResolved {
  /**
   * @param {Trait} trait
   * @param {Set<[string, string]>} mutualExclusives
   * @param {Map<string, string>} lang
   */
  constructor(trait, mutualExclusives, lang) {
    /** @type {Set<string>} */
    let exclusives = new Set();
    for (const [id1, id2] of mutualExclusives) {
      if (id1 === trait.id) exclusives.add(id2);
      if (id2 === trait.id) exclusives.add(id1);
    };

    /** @type {string} */
    this.id = trait.id;
    /** @type {string?} */
    this.name = lang.get(trait.nameKey) || null;
    /** @type {string?} */
    this.description = lang.get(trait.descriptionKey) || null;
    /** @type {number} */
    this.shortcut = trait.shortcut;
    /** @type {string?} */
    this.icon = trait.iconPath;
    /** @type {number} */
    this.cost = trait.cost;
    /** @type {boolean} */
    this.isProfessionTrait = trait.isProfessionTrait;
    /** @type {boolean} */
    this.isSleepTrait = trait.isSleepTrait;
    /** @type {boolean} */
    this.isDisabledInMp = trait.isDisabledInMp;
    /** @type {Map<string, integer>} */
    this.xpBoosts = trait.xpBoosts;
    /** @type {string[]} */
    this.freeRecipes = trait.freeRecipes;
    /** @type {Set<string>} */
    this.exclusives = exclusives;
  }
}

class Profession {
  /**
   * @param {string} id
   * @param {ProfessionBase} object
   */
  constructor(id, object) {
    Profession.validator.apply(object);

    /** @type {string} */
    this.id = id;
    /** @type {string} */
    this.nameKey = object.name_key;
    /** @type {string?} */
    this.descriptionKey = object.description_key;
    /** @type {number} */
    this.shortcut = object.shortcut;
    /** @type {string?} */
    this.iconPath = object.hasOwnProperty("icon_path") ? object.icon_path : null;
    /** @type {number} */
    this.points = object.points;
    /** @type {Map<string, number>} */
    this.xpBoosts = object.hasOwnProperty("xp_boosts") ? new Map(Object.entries(object.xp_boosts)) : new Map();
    /** @type {string[]} */
    this.freeRecipes = object.hasOwnProperty("free_recipes") ? object.free_recipes : [];
    /** @type {string[]} */
    this.freeTraits = object.hasOwnProperty("free_traits") ? object.free_traits : [];
    /** @type {Condition?} */
    this.condition = object.hasOwnProperty("condition") ? new Condition(object.condition) : null;
  }

  static validator = Validator.isObjectStruct({
    "name_key": Validator.isString,
    "description_key": Validator.isString.asOptionalProperty(),
    "shortcut": Validator.isNumber,
    "icon_path": Validator.isType(["null", "string"]).asOptionalProperty(),
    "points": Validator.isNumber,
    "xp_boosts": Validator.isObjectMap(Validator.isNumber).asOptionalProperty(),
    "free_recipes": Validator.isArrayList(Validator.isString).asOptionalProperty(),
    "free_traits": Validator.isArrayList(Validator.isString).asOptionalProperty(),
    "condition": null
  });
}

class ProfessionResolved {
  /**
   * @param {Profession} profession
   * @param {Map<string, TraitResolved>} traits
   * @param {Map<string, string>} lang
   */
  constructor(profession, traits, lang) {
    /** @type {string} */
    this.id = profession.id;
    /** @type {string?} */
    this.name = lang.get(profession.nameKey) || null;
    /** @type {string?} */
    this.description = lang.get(profession.descriptionKey) || null;
    /** @type {number} */
    this.shortcut = profession.shortcut;
    /** @type {string?} */
    this.icon = profession.iconPath;
    /** @type {number} */
    this.points = profession.points;
    /** @type {Map<string, number>} */
    this.xpBoosts = profession.xpBoosts;
    /** @type {string[]} */
    this.freeRecipes = profession.freeRecipes;
    /** @type {string[]} */
    this.freeTraits = profession.freeTraits.filter(t => traits.has(t));
  }
}

class Mod {
  /**
   * @param {ModBase} object
   */
  constructor(object) {
    Mod.validator.apply(object);

    const mapTrait = ([id, object]) => [id, new Trait(id, object)];
    const mapProfession = ([id, object]) => [id, new Profession(id, object)];

    /** @type {string} */
    this.id = object.id;
    /** @type {string} */
    this.name = object.name;
    /** @type {string} */
    this.author = object.author;
    /** @type {string[]} */
    this.requires = object.hasOwnProperty("requires") ? object.requires : [];
    /** @type {string[]} */
    this.incompatible = object.hasOwnProperty("incompatible") ? object.incompatible : [];
    /** @type {number?} */
    this.workshopId = object.hasOwnProperty("workshop_id") ? object.workshop_id : null;
    /** @type {boolean} */
    this.removeDefaultProfessions = object.hasOwnProperty("remove_default_professions") ? object.remove_default_professions : false;
    /** @type {number} */
    this.shortcut = object.shortcut;
    /** @type {Map<string, Trait>} */
    this.traits = object.hasOwnProperty("traits")
      ? new Map(Object.entries(object.traits).map(mapTrait)) : new Map();
    /** @type {Map<string, Profession>} */
    this.professions = object.hasOwnProperty("professions")
      ? new Map(Object.entries(object.professions).map(mapProfession)) : new Map();
    /** @type {Set<[string, string]>} */
    this.mutualExclusives = object.hasOwnProperty("mutual_exclusives")
      ? new Set(Array.prototype.map.call(object.mutual_exclusives, sortPair)) : new Set();
    /** @type {Map<string, string>} */
    this.lang = object.hasOwnProperty("lang")
      ? new Map(Object.entries(object.lang)) : new Map();
  }

  /**
   * @param {Mod[]} mods
   * @param {ModData}
   */
  static merge(mods) {
    const removeDefaultProfessions = mods.some((mod) => mod.removeDefaultProfessions);

    const ids = new Set(mods.map(mod => mod.id));
    const mutualExclusives = mergeSets(mods.map(mod => mod.mutualExclusives));
    const langMerged = mergeMaps(mods.map(mod => mod.lang));
    const traitsMerged = mergeMaps(mods.map(mod => mod.traits));
    const professionsMerged = mergeMaps(mods.map(mod => removeDefaultProfessions && mod.id === "Vanilla" ? [] : mod.professions));

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

    /** @type {Map<string, TraitResolved>} */
    let traits = new Map();
    for (const [id, trait] of traitsMerged.entries()) {
      if (shortcuts.traits.has(trait.shortcut))
        throw new Error(`Shortcut ID for trait ${trait.shortcut} already exists`);
      shortcuts.traits.set(trait.shortcut, id);
      if (trait.condition == null || trait.condition.test(ids)) {
        traits.set(id, new TraitResolved(trait, mutualExclusives, langMerged));
      }
    }

    /** @type {Map<string, ProfessionResolved>} */
    let professions = new Map();
    for (const [id, profession] of professionsMerged.entries()) {
      if (shortcuts.professions.has(profession.shortcut))
        throw new Error(`Shortcut ID for profession ${profession.shortcut} already exists`);
      shortcuts.professions.set(profession.shortcut, id);
      if (profession.condition == null || profession.condition.test(ids)) {
        // `traits` is supplied here instead of `traitsMerged` because it has filtered out
        // traits that will not be included due to their conditions not being fulfilled
        professions.set(id, new ProfessionResolved(profession, traits, langMerged));
      }
    }

    return {
      ids,
      traits,
      professions,
      shortcuts
    };
  }

  static validator = Validator.isObjectStruct({
    "id": Validator.isString,
    "name": Validator.isString,
    "author": Validator.isString,
    "requires": Validator.isArrayList(Validator.isString).asOptionalProperty(),
    "incompatible": Validator.isArrayList(Validator.isString).asOptionalProperty(),
    "workshop_id": Validator.isType(["null", "number"]).asOptionalProperty(),
    "remove_default_professions": Validator.isBoolean.asOptionalProperty(),
    "shortcut": Validator.isNumber,
    "traits": Validator.isObject.asOptionalProperty(),
    "professions": Validator.isObject.asOptionalProperty(),
    "mutual_exclusives": Validator.isArrayList(Validator.isArrayTuple([Validator.isString, Validator.isString])).asOptionalProperty(),
    "lang": Validator.isObjectMap(Validator.isString).asOptionalProperty()
  });
}

/** @param {string} str @returns {string[]} */
function splitWhitespace(str) {
  return str.trim().split(/\s+/g).filter(s => s.length !== 0);
}

/**
 * @template K
 * @template V
 * @param {Map<K, V>[]} maps
 * @returns {Map<K, V>}
 */
function mergeMaps(maps) {
  let result = new Map();
  for (const map of maps) {
    for (const [key, value] of map) {
      result.set(key, value);
    }
  }

  return result;
}

/**
 * @template T
 * @param {Set<T>[]} sets
 * @returns {Set<T>}
 */
function mergeSets(sets) {
  let result = new Set();
  for (const set of sets) {
    for (const value of set) {
      result.add(value);
    }
  }

  return result;
}

/**
 * @template T
 * @param {Set<T>} set
 * @param {(value: T) => bool} predicate
 * @returns {Set<T>}
 */
function filterSet(set, predicate) {
  // Wow this is ugly, unfortunately I don't care
  return new Set(Array.from(set.values()).filter(predicate));
}

function clamp(min, max, value) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @template {any} T
 * @param {[T, T]} value
 * @returns {[T, T]}
 */
function sortPair(value) {
  const [a, b] = value;
  return a > b ? [b, a] : value;
}

/**
 * @typedef {object} ModData
 * @property {Set<string>} ids
 * @property {Map<string, TraitResolved>} traits
 * @property {Map<string, ProfessionResolved>} professions
 * @property {Shortcuts} shortcuts
 */

/**
 * @typedef {object} Shortcuts
 * @property {Map<number, string>} mods
 * @property {Map<number, string>} traits
 * @property {Map<number, string>} professions
 */

/**
 * The expected schema of mods as output from `JSON.parse`
 * @typedef {object} ModBase
 * @property {string} id
 * @property {string} name
 * @property {string} author
 * @property {string[]?} requires
 * @property {string[]?} incompatible
 * @property {number} workshop_id
 * @property {boolean?} remove_default_professions
 * @property {number} shortcut
 * @property {{ [id: string]: TraitBase }?} traits
 * @property {{ [id: string]: ProfessionBase }?} professions
 * @property {[string, string][]?} mutual_exclusives
 * @property {{ [key: string]: string }?} lang
 */

/**
 * The expected schema of traits as output from `JSON.parse`
 * @typedef {object} TraitBase
 * @property {string} name_key
 * @property {string} description_key
 * @property {number} shortcut
 * @property {string?} icon_path
 * @property {number} cost
 * @property {boolean?} is_profession_trait
 * @property {boolean?} is_sleep_trait
 * @property {boolean?} is_disabled_in_mp
 * @property {{ [skill: string]: number }?} xp_boosts
 * @property {string[]?} free_recipes
 * @property {object?} condition
 */

/**
 * The expected schema of professions as output from `JSON.parse`.
 * @typedef {object} ProfessionBase
 * @property {string} name_key
 * @property {string?} description_key
 * @property {number} shortcut
 * @property {string?} icon_path
 * @property {number} points
 * @property {{ [skill: string]: number }?} xp_boosts
 * @property {string[]?} free_recipes
 * @property {string[]?} free_traits
 * @property {object?} condition
 */
