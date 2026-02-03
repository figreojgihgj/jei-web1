import type {
  ItemDef,
  ItemId,
  ItemKey,
  PackManifest,
  PackTags,
  TagDef,
  ParamSchemaEntry,
  Recipe,
  RecipeTypeDef,
  SlotContent,
  SlotDef,
  Stack,
  StackFluid,
  StackKind,
  StackItem,
  StackTag,
} from 'src/jei/types';
import {
  PackValidationError,
  assertArray,
  assertNumber,
  assertOptionalArray,
  assertOptionalRecord,
  assertOptionalString,
  assertRecord,
  assertString,
  isRecord,
} from 'src/jei/utils/assert';

const ITEM_ID_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function assertItemId(value: unknown, jsonPath: string): ItemId {
  const id = assertString(value, jsonPath);
  if (!ITEM_ID_RE.test(id)) {
    throw new PackValidationError(jsonPath, 'expected ItemId "game.namespace.item"');
  }
  return id;
}

export function assertFluidId(value: unknown, jsonPath: string): string {
  const id = assertString(value, jsonPath);
  if (!ITEM_ID_RE.test(id)) {
    throw new PackValidationError(jsonPath, 'expected FluidId "game.namespace.fluid"');
  }
  return id;
}

function assertStackKind(value: unknown, jsonPath: string): StackKind {
  const kind = assertString(value, jsonPath);
  if (kind !== 'item' && kind !== 'tag' && kind !== 'fluid') {
    throw new PackValidationError(jsonPath, 'expected one of: item, tag, fluid');
  }
  return kind;
}

function assertSlotIO(value: unknown, jsonPath: string): 'input' | 'output' | 'catalyst' {
  const io = assertString(value, jsonPath);
  if (io !== 'input' && io !== 'output' && io !== 'catalyst') {
    throw new PackValidationError(jsonPath, 'expected one of: input, output, catalyst');
  }
  return io;
}

export function assertItemKey(value: unknown, jsonPath: string): ItemKey {
  const obj = assertRecord(value, jsonPath);
  const id = assertItemId(obj.id, `${jsonPath}.id`);
  const meta = obj.meta;
  if (meta !== undefined && typeof meta !== 'number' && typeof meta !== 'string') {
    throw new PackValidationError(`${jsonPath}.meta`, 'expected number or string');
  }
  const key: ItemKey = { id };
  if (meta !== undefined) key.meta = meta;
  if (obj.nbt !== undefined) key.nbt = obj.nbt;
  return key;
}

export function assertItemDef(value: unknown, jsonPath: string): ItemDef {
  const obj = assertRecord(value, jsonPath);
  const tagsRaw = assertOptionalArray(obj.tags, `${jsonPath}.tags`);
  const tags = tagsRaw?.map((t, i) => assertString(t, `${jsonPath}.tags[${i}]`));
  const icon = assertOptionalString(obj.icon, `${jsonPath}.icon`);
  const iconSpriteRaw = assertOptionalRecord(obj.iconSprite, `${jsonPath}.iconSprite`);
  let iconSprite: ItemDef['iconSprite'];
  if (iconSpriteRaw !== undefined) {
    const url = assertString(iconSpriteRaw.url, `${jsonPath}.iconSprite.url`);
    const position = assertString(iconSpriteRaw.position, `${jsonPath}.iconSprite.position`);
    const size = iconSpriteRaw.size;
    if (size !== undefined && typeof size !== 'number') {
      throw new PackValidationError(`${jsonPath}.iconSprite.size`, 'expected number');
    }
    const color = iconSpriteRaw.color;
    if (color !== undefined && typeof color !== 'string') {
      throw new PackValidationError(`${jsonPath}.iconSprite.color`, 'expected string');
    }
    iconSprite = {
      url,
      position,
      ...(size !== undefined ? { size } : {}),
      ...(color !== undefined ? { color } : {}),
    };
  }
  const source = assertOptionalString(obj.source, `${jsonPath}.source`);
  const description = assertOptionalString(obj.description, `${jsonPath}.description`);

  const def: ItemDef = {
    key: assertItemKey(obj.key, `${jsonPath}.key`),
    name: assertString(obj.name, `${jsonPath}.name`),
  };
  if (icon !== undefined) def.icon = icon;
  if (iconSprite !== undefined) def.iconSprite = iconSprite;
  if (tags !== undefined) def.tags = tags;
  if (source !== undefined) def.source = source;
  if (description !== undefined) def.description = description;
  return def;
}

export function assertStack(value: unknown, jsonPath: string): Stack {
  const obj = assertRecord(value, jsonPath);
  const kind = assertStackKind(obj.kind, `${jsonPath}.kind`);
  const amount = assertNumber(obj.amount, `${jsonPath}.amount`);
  const unit = assertOptionalString(obj.unit, `${jsonPath}.unit`);

  if (kind === 'item') {
    const id = assertItemId(obj.id, `${jsonPath}.id`);
    const meta = obj.meta;
    if (meta !== undefined && typeof meta !== 'number' && typeof meta !== 'string') {
      throw new PackValidationError(`${jsonPath}.meta`, 'expected number or string');
    }
    const out: StackItem = { kind, id, amount };
    if (unit !== undefined) out.unit = unit;
    if (meta !== undefined) out.meta = meta;
    if (obj.nbt !== undefined) out.nbt = obj.nbt;
    return out;
  }

  if (kind === 'fluid') {
    const id = assertFluidId(obj.id, `${jsonPath}.id`);
    const out: StackFluid = { kind, id, amount };
    if (unit !== undefined) out.unit = unit;
    return out;
  }

  const out: StackTag = { kind, id: assertString(obj.id, `${jsonPath}.id`), amount };
  if (unit !== undefined) out.unit = unit;
  return out;
}

function assertSlotContent(value: unknown, jsonPath: string): SlotContent {
  if (Array.isArray(value)) {
    return value.map((v, i) => assertStack(v, `${jsonPath}[${i}]`));
  }
  return assertStack(value, jsonPath);
}

export function assertSlotDef(value: unknown, jsonPath: string): SlotDef {
  const obj = assertRecord(value, jsonPath);
  const acceptRaw = assertArray(obj.accept, `${jsonPath}.accept`);
  const accept = acceptRaw.map((v, i) => assertStackKind(v, `${jsonPath}.accept[${i}]`));
  const label = assertOptionalString(obj.label, `${jsonPath}.label`);
  const def: SlotDef = {
    slotId: assertString(obj.slotId, `${jsonPath}.slotId`),
    io: assertSlotIO(obj.io, `${jsonPath}.io`),
    accept,
    x: assertNumber(obj.x, `${jsonPath}.x`),
    y: assertNumber(obj.y, `${jsonPath}.y`),
  };
  if (label !== undefined) def.label = label;
  return def;
}

function assertParamSchemaEntry(value: unknown, jsonPath: string): ParamSchemaEntry {
  const obj = assertRecord(value, jsonPath);
  const format = obj.format;
  if (
    format !== undefined &&
    format !== 'number' &&
    format !== 'integer' &&
    format !== 'percent' &&
    format !== 'duration'
  ) {
    throw new PackValidationError(`${jsonPath}.format`, 'expected number|integer|percent|duration');
  }
  const unit = assertOptionalString(obj.unit, `${jsonPath}.unit`);
  const out: ParamSchemaEntry = {
    displayName: assertString(obj.displayName, `${jsonPath}.displayName`),
  };
  if (unit !== undefined) out.unit = unit;
  if (obj.default !== undefined) out.default = obj.default;
  if (format !== undefined) out.format = format;
  return out;
}

export function assertRecipeTypeDef(value: unknown, jsonPath: string): RecipeTypeDef {
  const obj = assertRecord(value, jsonPath);

  const machineRaw = assertOptionalRecord(obj.machine, `${jsonPath}.machine`);
  let machine: RecipeTypeDef['machine'];
  if (machineRaw !== undefined) {
    const icon = assertOptionalString(machineRaw.icon, `${jsonPath}.machine.icon`);
    machine = {
      id: assertString(machineRaw.id, `${jsonPath}.machine.id`),
      name: assertString(machineRaw.name, `${jsonPath}.machine.name`),
      ...(icon !== undefined ? { icon } : {}),
    };
  }

  const slotsRaw = assertOptionalArray(obj.slots, `${jsonPath}.slots`);
  const slots = slotsRaw?.map((s, i) => assertSlotDef(s, `${jsonPath}.slots[${i}]`));

  const paramSchemaRaw = obj.paramSchema;
  let paramSchema: Record<string, ParamSchemaEntry> | undefined;
  if (paramSchemaRaw !== undefined) {
    const ps = assertRecord(paramSchemaRaw, `${jsonPath}.paramSchema`);
    paramSchema = {};
    Object.keys(ps).forEach((k) => {
      paramSchema![k] = assertParamSchemaEntry(ps[k], `${jsonPath}.paramSchema.${k}`);
    });
  }

  const defaultsRaw = obj.defaults;
  let defaults: Record<string, unknown> | undefined;
  if (defaultsRaw !== undefined) {
    defaults = assertRecord(defaultsRaw, `${jsonPath}.defaults`);
  }

  const out: RecipeTypeDef = {
    key: assertString(obj.key, `${jsonPath}.key`),
    displayName: assertString(obj.displayName, `${jsonPath}.displayName`),
    renderer: assertString(obj.renderer, `${jsonPath}.renderer`),
  };
  if (machine !== undefined) out.machine = machine;
  if (slots !== undefined) out.slots = slots;
  if (paramSchema !== undefined) out.paramSchema = paramSchema;
  if (defaults !== undefined) out.defaults = defaults;
  return out;
}

export function assertRecipe(value: unknown, jsonPath: string): Recipe {
  const obj = assertRecord(value, jsonPath);
  const slotContentsRaw = assertRecord(obj.slotContents, `${jsonPath}.slotContents`);
  const slotContents: Record<string, SlotContent> = {};
  Object.keys(slotContentsRaw).forEach((slotId) => {
    slotContents[slotId] = assertSlotContent(slotContentsRaw[slotId], `${jsonPath}.slotContents.${slotId}`);
  });

  const inlineItemsRaw = assertOptionalArray(obj.inlineItems, `${jsonPath}.inlineItems`);
  const inlineItems = inlineItemsRaw?.map((it, i) => assertItemDef(it, `${jsonPath}.inlineItems[${i}]`));

  const paramsRaw = obj.params;
  let params: Record<string, unknown> | undefined;
  if (paramsRaw !== undefined) {
    if (!isRecord(paramsRaw)) {
      throw new PackValidationError(`${jsonPath}.params`, 'expected object');
    }
    params = paramsRaw;
  }

  const out: Recipe = {
    id: assertString(obj.id, `${jsonPath}.id`),
    type: assertString(obj.type, `${jsonPath}.type`),
    slotContents,
  };
  if (params !== undefined) out.params = params;
  if (inlineItems !== undefined) out.inlineItems = inlineItems;
  return out;
}

export function assertPackManifest(value: unknown, jsonPath: string): PackManifest {
  const obj = assertRecord(value, jsonPath);
  const files = assertRecord(obj.files, `${jsonPath}.files`);
  const itemsPath = assertOptionalString(files.items, `${jsonPath}.files.items`);
  const tagsPath = assertOptionalString(files.tags, `${jsonPath}.files.tags`);
  const out: PackManifest = {
    packId: assertString(obj.packId, `${jsonPath}.packId`),
    gameId: assertString(obj.gameId, `${jsonPath}.gameId`),
    displayName: assertString(obj.displayName, `${jsonPath}.displayName`),
    version: assertString(obj.version, `${jsonPath}.version`),
    files: {
      recipeTypes: assertString(files.recipeTypes, `${jsonPath}.files.recipeTypes`),
      recipes: assertString(files.recipes, `${jsonPath}.files.recipes`),
    },
  };
  if (itemsPath !== undefined) out.files.items = itemsPath;
  if (tagsPath !== undefined) out.files.tags = tagsPath;

  if (isRecord(obj.startupDialog)) {
    const d = obj.startupDialog;
    out.startupDialog = {
      id: assertString(d.id, `${jsonPath}.startupDialog.id`),
      message: assertString(d.message, `${jsonPath}.startupDialog.message`),
      confirmText: assertOptionalString(d.confirmText, `${jsonPath}.startupDialog.confirmText`),
      title: assertOptionalString(d.title, `${jsonPath}.startupDialog.title`),
    };
  }

  return out;
}

function assertTagValue(value: unknown, jsonPath: string): string | { id: string; required?: boolean } {
  if (typeof value === 'string') return value;
  const obj = assertRecord(value, jsonPath);
  const id = assertString(obj.id, `${jsonPath}.id`);
  const required = obj.required;
  if (required !== undefined && typeof required !== 'boolean') {
    throw new PackValidationError(`${jsonPath}.required`, 'expected boolean');
  }
  return required === undefined ? { id } : { id, required };
}

function assertTagDef(value: unknown, jsonPath: string) {
  const obj = assertRecord(value, jsonPath);
  const replace = obj.replace;
  if (replace !== undefined && typeof replace !== 'boolean') {
    throw new PackValidationError(`${jsonPath}.replace`, 'expected boolean');
  }
  const valuesRaw = assertArray(obj.values, `${jsonPath}.values`);
  const values = valuesRaw.map((v, i) => assertTagValue(v, `${jsonPath}.values[${i}]`));
  return replace === undefined ? { values } : { replace, values };
}

export function assertPackTags(value: unknown, jsonPath: string): PackTags {
  const obj = assertRecord(value, jsonPath);
  const itemRaw = obj.item;
  let item: Record<string, unknown> | undefined;
  if (itemRaw !== undefined) {
    const rec = assertRecord(itemRaw, `${jsonPath}.item`);
    item = {};
    Object.keys(rec).forEach((k) => {
      item![k] = assertTagDef(rec[k], `${jsonPath}.item.${k}`);
    });
  }
  const out: PackTags = {};
  if (item !== undefined) out.item = item as Record<string, TagDef>;
  return out;
}
