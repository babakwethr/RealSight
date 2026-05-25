import { createContext, useContext } from 'react';

/**
 * When true, slides skip enter animations and render their final state
 * immediately. Set for the mobile/print stacked render so the PDF export
 * captures finished charts and counters instead of mid-animation frames.
 *
 * Lifted verbatim from the reference Cinematic Gold deck.
 */
export const StaticModeContext = createContext(false);

export const StaticModeProvider = StaticModeContext.Provider;

export const useStaticMode = () => useContext(StaticModeContext);
