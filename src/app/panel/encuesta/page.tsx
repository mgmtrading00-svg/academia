import Survey from '@/components/Survey';
import { currentShopId, getSurvey } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Encuesta() {
  const answers = await getSurvey((await currentShopId())!);
  return <Survey initial={answers} />;
}
