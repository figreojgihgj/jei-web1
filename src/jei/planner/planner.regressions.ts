import type { PackData, Recipe, RecipeTypeDef } from 'src/jei/types';
import type { JeiIndex } from 'src/jei/indexing/buildIndex';
import { itemKeyHash } from 'src/jei/indexing/key';
import { autoPlanSelections, buildRequirementTree } from './planner';

function collectCycleNodes(node: ReturnType<typeof buildRequirementTree>['root']): string[] {
  const hits: string[] = [];
  const visit = (n: typeof node) => {
    if (n.kind === 'item') {
      if (n.cycle) hits.push(itemKeyHash(n.itemKey));
      n.children.forEach(visit);
    }
  };
  visit(node);
  return hits;
}

export function runPlannerRegression_autoPlanAvoidsIllegalCycle(): void {
  const recipeTypesByKey = new Map<string, RecipeTypeDef>();
  recipeTypesByKey.set('t', { key: 't' } as unknown as RecipeTypeDef);

  const recipes: Recipe[] = [
    {
      id: 'rA1',
      type: 't',
      slotContents: {
        out: { kind: 'item', id: 'A', amount: 1 },
        in: { kind: 'item', id: 'B', amount: 1 },
      },
    } as unknown as Recipe,
    {
      id: 'rA2',
      type: 't',
      slotContents: {
        out: { kind: 'item', id: 'A', amount: 1 },
        in: { kind: 'item', id: 'C', amount: 1 },
      },
    } as unknown as Recipe,
    {
      id: 'rB1',
      type: 't',
      slotContents: {
        out: { kind: 'item', id: 'B', amount: 1 },
        in: { kind: 'item', id: 'A', amount: 1 },
      },
    } as unknown as Recipe,
  ];

  const recipesById = new Map<string, Recipe>(recipes.map((r) => [r.id, r]));
  const producingByKeyHash = new Map<string, string[]>();
  producingByKeyHash.set(itemKeyHash({ id: 'A' }), ['rA1', 'rA2']);
  producingByKeyHash.set(itemKeyHash({ id: 'B' }), ['rB1']);

  const index: JeiIndex = {
    itemsByKeyHash: new Map(),
    itemKeyHashesByItemId: new Map(),
    recipeTypesByKey,
    recipesById,
    producingByKeyHash,
    consumingByKeyHash: new Map(),
    producingByItemId: new Map(),
    consumingByItemId: new Map(),
    itemIdsByTagId: new Map(),
    tagIdsByItemId: new Map(),
  };

  const pack: PackData = {
    manifest: { gameId: 'test' } as unknown as PackData['manifest'],
    items: [],
    recipeTypes: [],
    recipes: [],
  } as unknown as PackData;

  const auto = autoPlanSelections({ pack, index, rootItemKey: { id: 'A' }, maxDepth: 20 });
  const chosenA = auto.selectedRecipeIdByItemKeyHash[itemKeyHash({ id: 'A' })];
  if (chosenA !== 'rA2') {
    throw new Error(`Regression: expected rA2 for A, got ${String(chosenA)}`);
  }

  const tree = buildRequirementTree({
    pack,
    index,
    rootItemKey: { id: 'A' },
    targetAmount: 1,
    selectedRecipeIdByItemKeyHash: new Map(Object.entries(auto.selectedRecipeIdByItemKeyHash)),
    selectedItemIdByTagId: new Map(Object.entries(auto.selectedItemIdByTagId)),
    maxDepth: 20,
  });

  const cycles = collectCycleNodes(tree.root);
  if (cycles.length) {
    throw new Error(`Regression: expected no cycle nodes, got ${cycles.join(', ')}`);
  }
}

