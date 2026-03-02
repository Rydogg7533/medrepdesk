import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { compressImage, blobToBase64 } from '@/utils/imageCompression';
import { canUseAIExtraction } from '@/utils/planLimits';

function useAccountId() {
  const { account } = useAuth();
  return account?.id;
}

export function useExtractPO() {
  const accountId = useAccountId();
  const { account } = useAuth();

  return useMutation({
    mutationFn: async ({ file, caseId }) => {
      if (!canUseAIExtraction(account)) {
        throw new Error('AI extraction limit reached. Please upgrade your plan.');
      }

      const compressed = await compressImage(file);
      const base64 = await blobToBase64(compressed);

      const { data, error } = await supabase.functions.invoke('extract-po', {
        body: {
          image_base64: base64,
          account_id: accountId,
          case_id: caseId || null,
        },
      });

      if (error) throw new Error(error.message || 'Extraction failed');
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}

export function useSmartCaseEntry() {
  const accountId = useAccountId();
  const { account } = useAuth();

  return useMutation({
    mutationFn: async (text) => {
      if (!canUseAIExtraction(account)) {
        throw new Error('AI extraction limit reached. Please upgrade your plan.');
      }

      const { data, error } = await supabase.functions.invoke('smart-case-entry', {
        body: {
          text,
          account_id: accountId,
        },
      });

      if (error) throw new Error(error.message || 'Parsing failed');
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}

export function useDraftChaseEmail() {
  const accountId = useAccountId();

  return useMutation({
    mutationFn: async ({ caseId, poId, tone }) => {
      const { data, error } = await supabase.functions.invoke('draft-chase-email', {
        body: {
          case_id: caseId,
          po_id: poId,
          account_id: accountId,
          tone,
        },
      });

      if (error) throw new Error(error.message || 'Draft failed');
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}

export function useCommissionCheck() {
  const accountId = useAccountId();

  return useMutation({
    mutationFn: async (distributorId) => {
      const { data, error } = await supabase.functions.invoke('commission-check', {
        body: {
          account_id: accountId,
          distributor_id: distributorId,
        },
      });

      if (error) throw new Error(error.message || 'Analysis failed');
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}
