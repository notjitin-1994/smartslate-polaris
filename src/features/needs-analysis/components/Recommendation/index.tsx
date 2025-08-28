import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Lightbulb, FileText } from 'lucide-react'

// Placeholder for recommendation component
export function RecommendationView() {
  const navigate = useNavigate()
  const { id: projectId } = useParams()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">
            Recommendations
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            AI-generated training solutions based on your needs analysis
          </p>
        </div>

        <div className="p-6">
          <div className="text-center py-12">
            <Lightbulb className="mx-auto h-12 w-12 text-blue-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Recommendations Coming Soon
            </h3>
            <p className="text-gray-600 mb-6">
              This feature will provide tailored training recommendations and blended learning approaches
            </p>
            <button
              onClick={() => navigate(`/needs-analysis/${projectId}/report`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              View Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
