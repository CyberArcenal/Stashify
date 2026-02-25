import React from 'react'
import KPIcard from '../../../components/UI/KPIcard'

const KPIcards: React.FC = () => {
  const { stats, loading } = useDashboard()

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="kpi-grid">
      <KPIcard
        title="Total Products"
        value={stats.totalProducts}
        variant="info"
      />
      <KPIcard
        title="Low Stock"
        value={stats.lowStock}
        subtitle="Items need restocking"
        variant="warning"
      />
      <KPIcard
        title="Out of Stock"
        value={stats.outOfStock}
        variant="danger"
      />
      <KPIcard
        title="Total Orders"
        value={stats.totalOrders}
        variant="success"
      />
    </div>
  )
}

export default KPIcards

function useDashboard(): { stats: any; loading: any } {
  throw new Error('Function not implemented.')
}
