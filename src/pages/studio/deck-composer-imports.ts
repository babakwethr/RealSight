/**
 * Re-exports the wizard step components from the feature folder so
 * the page-level `DeckComposer.tsx` keeps a flat import list. Pure
 * re-export module — no logic.
 */
export { StepIndicator } from '@/features/studio/deck-builder/composer/StepIndicator';
export { StepBrief } from '@/features/studio/deck-builder/composer/StepBrief';
export { StepReferences } from '@/features/studio/deck-builder/composer/StepReferences';
export { StepTemplate } from '@/features/studio/deck-builder/composer/StepTemplate';
export { StepOutline } from '@/features/studio/deck-builder/composer/StepOutline';
export { StepPublish } from '@/features/studio/deck-builder/composer/StepPublish';
