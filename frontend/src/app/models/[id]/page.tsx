'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { ModelEditorWorkspace } from '@/src/components/model/ModelEditorWorkspace';

export default function ModelEditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const modelId = (params.id as string | undefined) ?? '';
  const isEmbedded = searchParams.get('embed') === '1';

  return (
    <ModelEditorWorkspace
      modelId={modelId}
      isEmbedded={isEmbedded}
    />
  );
}
