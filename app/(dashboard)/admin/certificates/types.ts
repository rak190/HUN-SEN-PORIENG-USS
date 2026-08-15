export type ElementType = 'text' | 'image';

export interface TemplateElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Text specific
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: 'normal' | 'bold';
  
  // Image specific
  src?: string;
}

export interface CertificateTemplateConfig {
  id: string;
  name: string;
  background_image_url: string;
  elements: TemplateElement[];
}

// Fixed dimensions for A4 Landscape
export const A4_WIDTH = 1123;
export const A4_HEIGHT = 794;

export const DEFAULT_TEMPLATE: CertificateTemplateConfig = {
  id: 'default-golden-template',
  name: 'Golden Certificate MOEYS',
  background_image_url: '/assets/certificates/golden-frame.png',
  elements: [
    {
      id: 'bg-logo',
      type: 'image',
      src: '/assets/certificates/faded-logo.png',
      x: 361,
      y: 197,
      width: 400,
      height: 400
    },
    {
      id: 'moeys-logo',
      type: 'image',
      src: '/assets/certificates/moeys-logo.png',
      x: 246.58125296525293,
      y: 115.40798939187462,
      width: 80,
      height: 82
    },
    {
      id: 'el-school',
      type: 'text',
      content: 'មន្ទីរអប់រំ យុវជន និងកីឡា ខេត្តព្រៃវែង\nការិយាល័យអប់រំ យុវជន និងកីឡា ស្រុកពោធិ៍រៀង\nវិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង',
      x: 92.93333333333334,
      y: 184.23466666666667,
      width: 400,
      height: 100,
      fontFamily: 'Moul',
      fontSize: 14,
      color: '#000000',
      textAlign: 'center',
      fontWeight: 'normal'
    },
    {
      id: 'el-kingdom',
      type: 'text',
      content: 'ព្រះរាជាណាចក្រកម្ពុជា',
      x: 671.5306666666665,
      y: 85.17866666666666,
      width: 400,
      height: 100,
      fontFamily: 'Moul',
      fontSize: 18,
      color: '#085394',
      textAlign: 'center',
      fontWeight: 'normal'
    },
    {
      id: 'el-title',
      type: 'text',
      content: 'បណ្ណសរសើរ',
      x: 0,
      y: 260,
      width: 1123,
      height: 100,
      fontFamily: 'Moul',
      fontSize: 60,
      color: '#FF0000',
      textAlign: 'center',
      fontWeight: 'normal'
    },
    {
      id: 'el-subtitle',
      type: 'text',
      content: 'នាយកវិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង',
      x: 0,
      y: 350,
      width: 1123,
      height: 60,
      fontFamily: 'Moul',
      fontSize: 22,
      color: '#085394',
      textAlign: 'center',
      fontWeight: 'normal'
    },
    {
      id: 'el-body',
      type: 'text',
      content: 'សូមសរសើរចំពោះសិស្សឈ្មោះ៖ {{student_name}} ភេទ {{gender}} កើតនៅថ្ងៃទី {{dob}} រៀនថ្នាក់ទី {{grade_class}}\nនៃវិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង ដែលបានខិតខំរៀនសូត្រទទួលបានលទ្ធផលល្អក្នុងកាសិក្សា និងទទួលបានចំណាត់ថ្នាក់លេខ {{grade_rank}}\nប្រចាំឆ្នាំសិក្សា {{academic_year}} ។ បណ្ណសរសើរនេះប្រគល់ជូនសាមីខ្លួនប្រើប្រាស់តាមការដែលអាចប្រើបាន ។',
      x: 80,
      y: 358.5973333333337,
      width: 963,
      height: 150,
      fontFamily: 'Kantumruy Pro',
      fontSize: 16,
      color: '#085394',
      textAlign: 'center',
      fontWeight: 'normal'
    },
    {
      id: 'el-footer-left',
      type: 'text',
      content: 'បានឃើញ និងឯកភាព\nនាយកសាលា',
      x: 117.88266666666667,
      y: 509.7706666666666,
      width: 300,
      height: 100,
      fontFamily: 'Moul',
      fontSize: 16,
      color: '#085394',
      textAlign: 'center',
      fontWeight: 'normal'
    },
    {
      id: 'el-photo',
      type: 'text',
      content: '៤×៦',
      x: 501,
      y: 530,
      width: 120,
      height: 160,
      fontFamily: 'Kantumruy Pro',
      fontSize: 16,
      color: '#000000',
      textAlign: 'center',
      fontWeight: 'normal'
    },
    {
      id: 'el-date-text',
      type: 'text',
      content: 'ថ្ងៃសៅរ៍ ១៤ កើត ខែអស្សុជ ឆ្នាំថោះ បញ្ចស័ក ព.ស.២៥៦៧\n....................., ត្រូវនឹងថ្ងៃទី {{solar_date}}',
      x: 579.1839999999997,
      y: 483.0613333333333,
      width: 450,
      height: 60,
      fontFamily: 'Kantumruy Pro',
      fontSize: 16,
      color: '#085394',
      textAlign: 'center',
      fontWeight: 'normal'
    },
    {
      id: 'el-date-signature',
      type: 'text',
      content: 'គ្រូបន្ទុកថ្នាក់',
      x: 621.5306666666665,
      y: 535.5359999999998,
      width: 450,
      height: 50,
      fontFamily: 'Moul',
      fontSize: 16,
      color: '#085394',
      textAlign: 'center',
      fontWeight: 'normal'
    },
    {
      id: 'el-1786159367082',
      type: "text",
      x: 720.6306666666666,
      y: 140.44533333333348,
      width: 300,
      height: 60,
      content: "ជាតិ សាសនា ព្រះមហាក្សត្រ",
      fontFamily: "Moul",
      fontSize: 16,
      color: "#085394",
      textAlign: "center",
      fontWeight: "normal"
    }
  ]
} as CertificateTemplateConfig;
