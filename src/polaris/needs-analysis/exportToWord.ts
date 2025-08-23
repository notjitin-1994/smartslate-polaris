// src/polaris/needs-analysis/exportToWord.ts
import { saveAs } from 'file-saver';
import { 
  Document, 
  Paragraph, 
  TextRun, 
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  convertInchesToTwip,
  HeadingLevel
} from 'docx';
import type { NAReport } from './report';
import { tryExtractJson } from './json';

// Parse report from markdown or JSON
function parseReport(content: string): NAReport | null {
  try {
    // Try to extract JSON first
    const jsonStr = tryExtractJson(content);
    return JSON.parse(jsonStr) as NAReport;
  } catch {
    // Fallback to parsing markdown structure
    try {
      const report: NAReport = {
        summary: {
          problem_statement: '',
          current_state: [],
          root_causes: [],
          objectives: []
        },
        solution: {
          modalities: [],
          scope: {
            audiences: [],
            competencies: [],
            content_outline: []
          }
        },
        learner_analysis: {
          profile: {
            demographics: [],
            tech_readiness: '',
            learning_style_fit: []
          },
          engagement_strategy: {
            motivation_drivers: [],
            potential_barriers: [],
            support_mechanisms: []
          },
          design_implications: {
            content_adaptations: [],
            delivery_adjustments: [],
            accessibility_requirements: [],
            language_considerations: []
          }
        },
        technology_talent: {
          tech_enablers: {
            available: [],
            required: [],
            integration_needs: []
          },
          talent_requirements: {
            internal_roles: [],
            external_support: [],
            development_needs: []
          },
          limitations_impact: {
            tech_constraints: [],
            talent_gaps_impact: [],
            mitigation_strategies: []
          }
        },
        delivery_plan: {
          phases: [],
          timeline: [],
          resources: []
        },
        measurement: {
          success_metrics: [],
          assessment_strategy: [],
          data_sources: []
        },
        budget: {
          notes: '',
          ranges: []
        },
        risks: [],
        next_steps: []
      };

      const lines = content.split('\n');
      let currentSection = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Parse sections and content
        if (trimmed.includes('Problem Statement:')) {
          report.summary.problem_statement = trimmed.replace(/.*Problem Statement:\s*/, '').replace(/[*_]/g, '');
        } else if (trimmed.includes('Next Steps') || trimmed.includes('Immediate Next Steps')) {
          currentSection = 'next_steps';
        } else if (currentSection === 'next_steps' && /^\d+\./.test(trimmed)) {
          report.next_steps.push(trimmed.replace(/^\d+\.\s*/, ''));
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const item = trimmed.substring(2);
          // Add to appropriate section based on context
          if (content.indexOf(line) < content.length / 3) {
            report.summary.current_state.push(item);
          }
        }
      }
      
      return report;
    } catch (error) {
      console.error('Failed to parse report:', error);
      return null;
    }
  }
}

// Create styled Word document with proper white text on dark background
export async function exportToWord(
  htmlContent: string,
  filename: string = 'Needs-Analysis-Report'
): Promise<void> {
  try {
    const { Packer } = await import('docx');
    
    // Parse the report
    const report = parseReport(htmlContent);
    
    const sections: any[] = [];
    
    // Add title section with proper white text and compacted spacing
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "NEEDS ANALYSIS",
            bold: true,
            size: 40,
            color: "FFFFFF",  // White text
            font: "Segoe UI"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 }
      })
    );
    
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "REPORT",
            bold: true,
            size: 40,
            color: "FFFFFF",  // White text
            font: "Segoe UI"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 }
      })
    );
    
    // Add decorative line
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            color: "A7DADB",
            size: 20
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 }
      })
    );
    
    // Main content
    if (report) {
      // Executive Summary
      if (report.summary) {
        sections.push(
          new Paragraph({
            text: "▎ EXECUTIVE SUMMARY",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 280, after: 140 }
          })
        );
        
        // Problem Statement
        if (report.summary.problem_statement) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ 
                  text: "Problem Statement: ", 
                  bold: true, 
                  color: "A7DADB",  // Teal
                  size: 24
                }),
                new TextRun({ 
                  text: report.summary.problem_statement,
                  color: "FFFFFF",  // White
                  size: 22
                })
              ],
              spacing: { after: 160 },
              indent: { left: convertInchesToTwip(0.5), right: convertInchesToTwip(0.25) },
              alignment: AlignmentType.JUSTIFIED
            })
          );
        }
        
        // Helper function to add lists with white text
        const addList = (title: string, items: string[], titleColor: string = "A7DADB") => {
          if (items.length > 0) {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: title, 
                    bold: true, 
                    color: titleColor,
                    size: 24
                  })
                ],
                spacing: { before: 160, after: 80 },
                indent: { left: convertInchesToTwip(0.5) }
              })
            );
            
            items.forEach(item => {
              sections.push(
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: "• ",
                      color: titleColor,
                      size: 22
                    }),
                    new TextRun({ 
                      text: item,
                      color: "FFFFFF",  // White text
                      size: 22
                    })
                  ],
                  indent: { left: convertInchesToTwip(0.75), right: convertInchesToTwip(0.25) },
                  alignment: AlignmentType.JUSTIFIED,
                  spacing: { after: 40 }
                })
              );
            });
          }
        };
        
        addList("Current State:", report.summary.current_state);
        addList("Root Causes:", report.summary.root_causes, "EFC148");
        addList("Objectives:", report.summary.objectives);
      }
      
      // Recommended Solution
      if (report.solution && report.solution.modalities.length > 0) {
        sections.push(
          new Paragraph({
            text: "▎ RECOMMENDED SOLUTION",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          })
        );
        
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Delivery Modalities",
                bold: true,
                color: "A7DADB",
                size: 26
              })
            ],
            spacing: { before: 80, after: 80 },
            indent: { left: convertInchesToTwip(0.5) }
          })
        );
        
        // Create modalities table with white text
        const modalityRows = [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ 
                    text: "MODALITY", 
                    bold: true, 
                    color: "FFFFFF",
                    size: 22
                  })],
                  alignment: AlignmentType.CENTER
                })],
                shading: { fill: "2C5F5F", type: ShadingType.SOLID },
                width: { size: 35, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ 
                    text: "RATIONALE", 
                    bold: true, 
                    color: "FFFFFF",
                    size: 22
                  })],
                  alignment: AlignmentType.CENTER
                })],
                shading: { fill: "2C5F5F", type: ShadingType.SOLID },
                width: { size: 65, type: WidthType.PERCENTAGE }
              })
            ]
          })
        ];
        
        report.solution.modalities.forEach((m, index) => {
          modalityRows.push(
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ 
                      text: m.name, 
                      bold: true,
                      color: "A7DADB",
                      size: 20
                    })]
                  })],
                  shading: { fill: index % 2 === 0 ? "1A1F2E" : "0F1419", type: ShadingType.SOLID }
                }),
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({
                      text: m.reason,
                      color: "FFFFFF",
                      size: 20
                    })]
                  })],
                  shading: { fill: index % 2 === 0 ? "1A1F2E" : "0F1419", type: ShadingType.SOLID }
                })
              ]
            })
          );
        });
        
        sections.push(
          new Table({
            rows: modalityRows,
            width: { size: 90, type: WidthType.PERCENTAGE },
            indent: { size: convertInchesToTwip(0.5), type: WidthType.DXA }
          })
        );
      }
      
      // Success Metrics
      if (report.measurement && report.measurement.success_metrics.length > 0) {
        sections.push(
          new Paragraph({
            text: "▎ SUCCESS METRICS",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 280, after: 140 }
          })
        );
        
        report.measurement.success_metrics.forEach(metric => {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ 
                  text: "• ",
                  color: "A7DADB",
                  size: 22
                }),
                new TextRun({ 
                  text: metric,
                  color: "FFFFFF",
                  size: 22
                })
              ],
              indent: { left: convertInchesToTwip(0.75) },
              spacing: { after: 40 }
            })
          );
        });
      }
      
      // Timeline
      if (report.delivery_plan && report.delivery_plan.timeline.length > 0) {
        sections.push(
          new Paragraph({
            text: "▎ TIMELINE",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 280, after: 140 }
          })
        );
        
        report.delivery_plan.timeline.forEach(phase => {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ 
                  text: `${phase.label}: `,
                  bold: true,
                  color: "EFC148",
                  size: 22
                }),
                new TextRun({ 
                  text: `${phase.start} to ${phase.end}`,
                  color: "FFFFFF",
                  size: 22
                })
              ],
              indent: { left: convertInchesToTwip(0.75) },
              spacing: { after: 40 }
            })
          );
        });
      }
      
      // Immediate Next Steps
      if (report.next_steps && report.next_steps.length > 0) {
        sections.push(
          new Paragraph({
            text: "▎ IMMEDIATE NEXT STEPS",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 280, after: 140 }
          })
        );
        
        report.next_steps.forEach((step, index) => {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ 
                  text: `${index + 1}. `, 
                  bold: true, 
                  color: "EFC148",
                  size: 24
                }),
                new TextRun({ 
                  text: step,
                  color: "FFFFFF",
                  size: 22
                })
              ],
              spacing: { after: 80 },
              indent: { left: convertInchesToTwip(0.5) }
            })
          );
        });
      }
    } else {
      // Fallback content with white text
      sections.push(
        new Paragraph({
          text: "Report Content",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        })
      );
      
      const lines = htmlContent.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.replace(/[#*`]/g, '').trim(),
                color: "FFFFFF",
                size: 22
              })
            ],
            spacing: { after: 80 }
          })
        );
      });
    }
    
    // Footer
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            color: "A7DADB",
            size: 20
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 100 }
      })
    );
    
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Powered by ",
            color: "FFFFFF",
            size: 18
          }),
          new TextRun({
            text: "Smartslate Polaris",
            color: "A7DADB",
            size: 18,
            bold: true
          }),
          new TextRun({
            text: " • ",
            color: "FFFFFF",
            size: 18
          }),
          new TextRun({
            text: new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            color: "FFFFFF",
            size: 18
          })
        ],
        alignment: AlignmentType.CENTER
      })
    );
    
    // Create document with dark background
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1)
            },
            size: {
              orientation: "portrait"
            }
          }
        },
        children: sections
      }],
      background: {
        color: "0F1419"  // Dark background
      },
      styles: {
        default: {
          document: {
            run: {
              font: "Segoe UI",
              size: 22,
              color: "FFFFFF"  // Default white text
            },
            paragraph: {
              spacing: {
                line: 276
              }
            }
          }
        },
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 32,
              bold: true,
              color: "FFFFFF"  // White headings
            },
            paragraph: {
              spacing: { before: 300, after: 150 }
            }
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 26,
              bold: true,
              color: "A7DADB"  // Teal subheadings
            },
            paragraph: {
              spacing: { before: 200, after: 100 }
            }
          }
        ]
      }
    });
    
    // Generate and save
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
  } catch (error) {
    console.error('Error exporting to Word:', error);
    throw new Error('Failed to export to Word document');
  }
}

// Format report for Word
export function formatReportForWord(reportElement: HTMLElement): string {
  return reportElement.innerText || reportElement.textContent || '';
}