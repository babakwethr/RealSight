/**
 * Re-exports the wizard step components from the feature folder so
 * the page-level `DeckComposer.tsx` keeps a flat import list. Pure
 * re-export module — no logic.
 */
export { StepIndicator } from '@/features/studio/deck-builder/composer/StepIndicator';
export { StepBrief } from '@/features/studio/deck-builder/composer/StepBrief';
export { StepTemplate } from '@/features/studio/deck-builder/composer/StepTemplate';
export { StepOutline } from '@/features/studio/deck-builder/composer/StepOutline';
export { StepVisuals } from '@/features/studio/deck-builder/composer/StepVisuals';
export { StepPublish } from '@/features/studio/deck-builder/composer/StepPublish';
export { WizardErrorBoundary } from '@/features/studio/deck-builder/composer/WizardErrorBoundary';
