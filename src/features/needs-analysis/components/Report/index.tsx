import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileText, Download, Check } from 'lucide-react'

// Placeholder for report component
export function ReportView() {
  const navigate = useNavigate()
  const { id: projectId } = useParams()
  const [isApproved, setIsApproved] = useState(false)

  const handleApprove = () => {
    // TODO: Call approval API
    setIsApproved(true)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">
            Needs Analysis Report
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Executive summary and detailed recommendations
          </p>
        </div>

        <div className="p-6">
          <div className="prose max-w-none">
            <h2>Executive Summary</h2>
            <p>
              This report provides a comprehensive analysis of your training needs
              and recommended solutions.
            </p>
            
            <h2>Key Findings</h2>
            <ul>
              <li>Performance gaps identified in customer service interactions</li>
              <li>Knowledge deficiencies in product features</li>
              <li>Need for improved soft skills training</li>
            </ul>
            
            <h2>Recommendations</h2>
            <p>
              Based on our analysis, we recommend a blended learning approach
              combining microlearning modules with guided practice sessions.
            </p>
            
            <h2>Estimated Investment</h2>
            <p>
              Total project cost: $45,000<br />
              Timeline: 12 weeks<br />
              Expected ROI: 150% within 6 months
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Export Word
              </button>
            </div>
            
            {!isApproved ? (
              <button
                onClick={handleApprove}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Check className="w-4 h-4" />
                Approve Report
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                <span className="font-medium">Approved</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
