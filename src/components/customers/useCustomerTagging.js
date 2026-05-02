import { useState, useCallback } from 'react';
import { supabase } from '../../supabase';

export function useCustomerTagging() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const performTagAction = useCallback(async (customerId, action) => {
    try {
      setLoading(true);
      setError(null);

      const isBogus = action === 'MarkBogus';

      const { error: updateError } = await supabase
        .from('customers')
        .update({ manual_bogus: isBogus })
        .eq('id', customerId);

      if (updateError) throw updateError;

      return { success: true, action, customerId };
    } catch (err) {
      setError(err.message);
      console.error(`Error performing action ${action}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    performTagAction
  };
}