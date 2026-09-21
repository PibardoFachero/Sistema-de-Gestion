import { AnalyticsDashboard } from '@/features/analytics/components/AnalyticsDashboard';
import { getAnalyticsDashboardData } from '@/features/analytics/data/getAnalyticsDashboardData';

export default async function AnaliticaPage() {
  const data = await getAnalyticsDashboardData();
  return <AnalyticsDashboard data={data} />;
}
