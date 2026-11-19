import { useContext } from 'react';
import { FeedbackContext, FeedbackContextValue } from './FeedbackContext';

/**
 * Returns global toast and imperative confirm() controls from FeedbackProvider.
 */
export function useFeedback(): FeedbackContextValue {
  const context = useContext(FeedbackContext);
  if (context === null) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
}
