export type ViewMode = 'guest' | 'bartender';

export type PageView = 'session' | 'vault';

export type HistoryMode = 'push' | 'replace' | 'none';

export type BackbarShelf = 'spirits' | 'modifiers' | 'pantry';

export type IngredientRuleShelf = BackbarShelf | 'optional';

export type BackbarMatchMode = 'smart' | 'any';

export type GlassType =
  | 'coupe'
  | 'nick_nora'
  | 'martini'
  | 'highball'
  | 'pint'
  | 'mug'
  | 'irish_coffee'
  | 'bottle'
  | 'julep'
  | 'rocks';

export type IceType = 'neat' | 'chili_cube' | 'king_cube' | 'crushed' | 'cubes';

export type FillPattern =
  | 'woven'
  | 'dots'
  | 'cross'
  | 'diagonal'
  | 'dashes'
  | 'diagonal_weave'
  | 'bubbles'
  | 'foam';

export interface LayerStyle {
  readonly color: string;
  readonly pattern: FillPattern;
}

export interface SpecLayer {
  readonly name: string;
  readonly shortLabel: string;
  readonly measureLabel: string;
  readonly oz: number;
  readonly rawOz: number;
  readonly rawCount: number;
  readonly rawUnit: string;
  readonly isBarspoon: boolean;
  readonly color: string;
  readonly pattern: FillPattern;
}

export interface HashRouteInfo {
  readonly raw: string;
  readonly parts: readonly string[];
  readonly target: string;
  readonly hasBartender: boolean;
}

export interface PageViewOptions {
  readonly sessionId?: string | undefined;
  readonly scroll?: boolean | undefined;
  readonly history?: HistoryMode | undefined;
  readonly targetCardId?: string | null | undefined;
}

export interface IngredientRule {
  readonly id: string;
  readonly shelf: IngredientRuleShelf;
  readonly label: string;
  readonly shortLabel: string;
  readonly keywords: readonly string[];
}

export interface CatalogIngredient {
  readonly id: string;
  readonly shelf: IngredientRuleShelf;
  readonly label: string;
  readonly shortLabel: string;
  readonly keywords?: readonly string[] | undefined;
  readonly isAutoDiscovered?: boolean | undefined;
  readonly recipeIds: Set<string>;
}

export interface CardIngredientInfo {
  readonly spiritIds: Set<string>;
  readonly modifierIds: Set<string>;
  readonly pantryIds: Set<string>;
  readonly requiredIds: readonly string[];
}

export type CardMatchEval =
  | { readonly matchesSpirit: false }
  | {
      readonly matchesSpirit: true;
      readonly status: 'ready' | 'almost' | 'partial';
      readonly missingIds: readonly string[];
      readonly totalReq: number;
    };

export interface AppState {
  currentScale: number;
  currentPageView: PageView;
  currentSessionId: string;
}

declare global {
  interface Window {
    reindexVaultIngredients?: () => void;
  }
}
