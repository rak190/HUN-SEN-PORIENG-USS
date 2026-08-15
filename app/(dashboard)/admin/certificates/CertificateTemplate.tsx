import React, { forwardRef } from 'react';
import { CertificateTemplateConfig, A4_WIDTH, A4_HEIGHT } from './types';

export interface CertificateData {
  student_name: string;
  gender: string;
  dob: string;
  grade_class: string;
  grade_rank: number;
  grade_average: number;
  total_students: number;
  academic_year: string;
  issue_date: string;
  school_director: string;
  solar_date?: string;
  director_name?: string;
}

interface CertificateTemplateProps {
  data: CertificateData;
  config: CertificateTemplateConfig;
}

const CertificateTemplate = forwardRef<HTMLDivElement, CertificateTemplateProps>(
  ({ data, config }, ref) => {
    
    // Helper to replace dynamic tokens and render them in Red
    const replaceTokensWithFormatting = (text: string) => {
      if (!text) return null;
      const dataRecord = data as Record<string, any>;
      
      const parts = text.split(/({{.*?}})/g);
      return parts.map((part, index) => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
          const key = part.replace(/[{}]/g, '').trim();
          const value = dataRecord[key] || '';
          return <span key={index} style={{ color: '#FF0000', fontWeight: 'bold' }}>{value}</span>;
        }
        return part;
      });
    };

    const getImageUrl = (url: string | undefined) => {
      if (!url) return '';
      if (url.startsWith('uploads/')) return `/api/r2/image?key=${encodeURIComponent(url)}`;
      return url;
    };

    return (
      <div
        ref={ref}
        style={{
          width: `${A4_WIDTH}px`,
          height: `${A4_HEIGHT}px`,
          position: 'relative',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
          fontFamily: '"Kantumruy Pro", "Siemreap", sans-serif',
          color: '#000000',
        }}
      >
        {/* Background Frame */}
        {config.background_image_url && (
          <img
            src={getImageUrl(config.background_image_url)}
            alt="Frame"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              zIndex: 1,
            }}
          />
        )}

        {/* Dynamic Elements */}
        {config.elements.map(el => {
          const baseStyle: React.CSSProperties = {
            position: 'absolute',
            left: `${el.x}px`,
            top: `${el.y}px`,
            width: `${el.width}px`,
            height: `${el.height}px`,
            zIndex: 2,
          };

          if (el.type === 'image') {
            return (
              <div key={el.id} style={baseStyle}>
                <img 
                  src={getImageUrl(el.src)} 
                  alt="" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    border: el.id === 'el-photo' ? '1px solid black' : 'none'
                  }}
                />
              </div>
            );
          }

          if (el.type === 'text') {
            return (
              <div
                key={el.id}
                style={{
                  ...baseStyle,
                  fontFamily: el.fontFamily,
                  fontSize: `${el.fontSize}px`,
                  color: el.color,
                  textAlign: el.textAlign as any,
                  fontWeight: el.fontWeight,
                  whiteSpace: 'pre-wrap',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
                  border: el.id === 'el-photo' ? '1px solid black' : 'none'
                }}
              >
                <div style={{ width: '100%' }}>
                  {replaceTokensWithFormatting(el.content || '')}
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    );
  }
);

CertificateTemplate.displayName = 'CertificateTemplate';
export default CertificateTemplate;
