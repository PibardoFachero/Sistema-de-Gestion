import { AssistantChat } from '@/components/ia/AssistantChat';
import { GENERAL_ASSISTANT_CONTEXT } from '@/components/ia/types';

export default function IAPage() {
  return <AssistantChat context={GENERAL_ASSISTANT_CONTEXT} />;
}
