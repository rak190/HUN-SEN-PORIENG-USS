import React, { useMemo } from 'react';
import { Classroom, Student } from '@/types';
import { CURRICULUM_SCHEMAS } from '@/lib/curriculum';
import { computeSummaryGrades } from '@/lib/grade-calculations';

interface Props {
  classInfo: Classroom;
  student: Student;
  allStudents: Student[];
  gradesData: any[];
  teacherName: string;
}

export default function StudentRecordBook({ classInfo, student, allStudents, gradesData, teacherName }: Props) {
  // Use curriculum schema
  const schemaId = classInfo.grade.startsWith('10') || classInfo.grade.startsWith('11') || classInfo.grade.startsWith('12') 
    ? (classInfo.grade.includes('A') || classInfo.grade.includes('B') || classInfo.grade.includes('C') ? 'upper-sec-sci' : 'upper-sec-art')
    : 'lower-sec';
  const schema = CURRICULUM_SCHEMAS[schemaId] || CURRICULUM_SCHEMAS['lower-sec'];

  const processedData = useMemo(() => {
    const subjectIds = schema.subjects.map(s => s.id);
    
    // 1. Compute summaries for ALL students to determine ranks
    const allStudentSem1Scores: Record<string, Record<string, number>> = {};
    const allStudentSem2Scores: Record<string, Record<string, number>> = {};
    const allStudentAnnualScores: Record<string, Record<string, number>> = {};

    allStudents.forEach(s => {
      allStudentSem1Scores[s.id] = computeSummaryGrades(gradesData, s.id, 'sem1-summary', subjectIds);
      allStudentSem2Scores[s.id] = computeSummaryGrades(gradesData, s.id, 'sem2-summary', subjectIds);
      allStudentAnnualScores[s.id] = computeSummaryGrades(gradesData, s.id, 'annual', subjectIds);
    });

    const getRank = (subjectId: string, scoresMap: Record<string, Record<string, number>>, targetScore: number) => {
      const allScores = allStudents
        .map(s => scoresMap[s.id]?.[subjectId])
        .filter((score): score is number => score !== undefined && !isNaN(score))
        .sort((a, b) => b - a);
      if (allScores.length === 0) return null;
      return allScores.indexOf(targetScore) + 1;
    };

    const subjectStats: Record<string, any> = {};
    const mySem1 = allStudentSem1Scores[student.id] || {};
    const mySem2 = allStudentSem2Scores[student.id] || {};
    const myAnnual = allStudentAnnualScores[student.id] || {};

    let sem1Total = 0, sem2Total = 0, annualTotal = 0;
    let sem1Count = 0, sem2Count = 0, annualCount = 0;

    schema.subjects.forEach(sub => {
      const sem1 = mySem1[sub.id];
      const sem2 = mySem2[sub.id];
      const annual = myAnnual[sub.id];
      
      subjectStats[sub.id] = {
        sem1: sem1 ?? null,
        sem1Rank: sem1 !== undefined ? getRank(sub.id, allStudentSem1Scores, sem1) : null,
        sem2: sem2 ?? null,
        sem2Rank: sem2 !== undefined ? getRank(sub.id, allStudentSem2Scores, sem2) : null,
        annual: annual ?? null,
        annualRank: annual !== undefined ? getRank(sub.id, allStudentAnnualScores, annual) : null,
      };

      if (sem1 !== undefined) { sem1Total += sem1; sem1Count++; }
      if (sem2 !== undefined) { sem2Total += sem2; sem2Count++; }
      if (annual !== undefined) { annualTotal += annual; annualCount++; }
    });

    const totalCoefficient = schema.subjects.reduce((sum, sub) => sum + sub.maxScore, 0) / 50;

    return {
      stats: subjectStats,
      sem1Total,
      sem1Avg: sem1Total / totalCoefficient,
      sem2Total,
      sem2Avg: sem2Total / totalCoefficient,
      annualTotal,
      annualAvg: annualTotal / totalCoefficient
    };
  }, [gradesData, schema, student.id, allStudents]);

  return (
    <div className="p-8 print:p-0 w-[1122px] shrink-0 bg-white shadow-[0_0_40px_rgba(0,0,0,0.1)] rounded-sm border border-slate-200/50 print:border-none print:shadow-none print:rounded-none print:w-full print:h-full">
      {/* Header Section */}
      <div className="flex justify-between items-end mb-3 text-blue-700 text-[13px] font-siemreap font-bold">
        <div className="flex items-center">
          <p>គោត្តនាម និងនាមសិស្ស</p>
          <p className="font-moul text-[13px] ml-6 text-[#155EEF] leading-none">{student.student_id_number ? student.student_id_number + '-' : ''}{student.full_name}</p>
          <p className="ml-6">ភេទ</p>
          <p className="font-moul text-[13px] ml-3 text-[#155EEF] leading-none">{student.gender === 'M' || student.gender === 'ប្រុស' ? 'ប្រុស' : 'ស្រី'}</p>
        </div>
        <div className="flex items-center gap-4">
          <p>ថ្នាក់ទី <span className="font-moul text-[13px] text-[#155EEF] leading-none ml-2">{classInfo.name}</span></p>
          <p>សិស្សសរុប <span className="ml-1 text-[13px]">{allStudents.length}នាក់</span></p>
          <p>ស្រី <span className="ml-1 text-[13px]">{allStudents.filter(s => s.gender === 'F' || s.gender === 'ស្រី').length}នាក់</span></p>
          <p className="text-red-600 font-bold text-[13px]">ឆ្នាំសិក្សា ៖ ២០២៥-២០២៦</p>
        </div>
      </div>

      <div className="flex gap-1.5 items-stretch flex-grow">
        {/* LEFT COLUMN: Study Results & Absences */}
        <div className="w-[57%] flex flex-col">
          <table className="w-full border-collapse border-2 border-black text-[12px] font-siemreap table-fixed h-full">
            <thead>
              {/* Section ក Title */}
              <tr>
                <th colSpan={8} className="border border-black p-1 text-center text-[#155EEF] bg-slate-50 print:bg-white text-[13px] font-moul font-normal">
                  ក/ លទ្ធផលនៃការសិក្សា
                </th>
              </tr>
              <tr className="bg-slate-50 print:bg-white text-[#155EEF]">
                <th className="border border-black p-1 text-center w-[120px]" rowSpan={2}>មុខវិជ្ជា</th>
                <th className="border border-black p-1 text-center" colSpan={2}>ឆមាសទី១</th>
                <th className="border border-black p-1 text-center" colSpan={2}>ឆមាសទី២</th>
                <th className="border border-black p-1 text-center" colSpan={2}>ប្រចាំឆ្នាំ</th>
                <th className="border border-black p-1 text-center w-24 leading-tight" rowSpan={2}>មូលវិចារហត្ថលេខា<br/>និងឈ្មោះគ្រូ</th>
              </tr>
              <tr className="bg-slate-50 print:bg-white text-[#155EEF]">
                <th className="border border-black p-1 text-center w-10">ម.ភាគ</th>
                <th className="border border-black p-1 text-center w-10">ចំ.ថ្នាក់</th>
                <th className="border border-black p-1 text-center w-10">ម.ភាគ</th>
                <th className="border border-black p-1 text-center w-10">ចំ.ថ្នាក់</th>
                <th className="border border-black p-1 text-center w-10">ម.ភាគ</th>
                <th className="border border-black p-1 text-center w-10">ចំ.ថ្នាក់</th>
              </tr>
            </thead>
            <tbody>
              {schema.subjects.map(sub => {
                const stat = processedData.stats[sub.id];
                return (
                  <tr key={sub.id}>
                    <td className="border border-black p-1 text-[#155EEF]">{sub.label}</td>
                    <td className={`border border-black p-1 text-center ${stat.sem1 !== null && stat.sem1 < 25 ? 'text-red-600 font-bold' : 'text-[#155EEF]'}`}>{stat.sem1 !== null ? stat.sem1.toFixed(2) : ''}</td>
                    <td className="border border-black p-1 text-center text-red-600 font-bold">{stat.sem1Rank !== null ? stat.sem1Rank : ''}</td>
                    <td className={`border border-black p-1 text-center ${stat.sem2 !== null && stat.sem2 < 25 ? 'text-red-600 font-bold' : 'text-[#155EEF]'}`}>{stat.sem2 !== null ? stat.sem2.toFixed(2) : ''}</td>
                    <td className="border border-black p-1 text-center text-red-600 font-bold">{stat.sem2Rank !== null ? stat.sem2Rank : ''}</td>
                    <td className={`border border-black p-1 text-center ${stat.annual !== null && stat.annual < 25 ? 'text-red-600 font-bold' : 'text-[#155EEF]'}`}>{stat.annual !== null ? stat.annual.toFixed(2) : ''}</td>
                    <td className="border border-black p-1 text-center text-red-600 font-bold">{stat.annualRank !== null ? stat.annualRank : ''}</td>
                    <td className="border border-black p-1 text-center text-[#155EEF]"></td>
                  </tr>
                );
              })}
              {/* Extra Subject Rows to match height */}
              {Array.from({ length: Math.max(0, 10 - schema.subjects.length) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border border-black p-1 text-[#155EEF]">&nbsp;</td>
                  <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                </tr>
              ))}
              
              {/* The 4 Average Rows */}
              <tr className="bg-slate-50 print:bg-white">
                <td className="border border-black p-1 text-[#155EEF] font-bold text-[11px]">សរុបពិន្ទុប្រឡងឆមាស</td>
                <td className="border border-black p-1 text-center text-[#155EEF]">{processedData.sem1Total > 0 ? processedData.sem1Total.toFixed(2) : ''}</td>
                <td className="border border-black p-1 text-center text-red-600 font-bold"></td>
                <td className="border border-black p-1 text-center text-[#155EEF]">{processedData.sem2Total > 0 ? processedData.sem2Total.toFixed(2) : ''}</td>
                <td className="border border-black p-1 text-center text-red-600 font-bold"></td>
                <td className="border border-black p-1 text-center text-[#155EEF]">{processedData.annualTotal > 0 ? processedData.annualTotal.toFixed(2) : ''}</td>
                <td className="border border-black p-1 text-center text-red-600 font-bold"></td>
                <td className="border border-black p-1 border-b-0"></td>
              </tr>
              <tr className="bg-slate-50 print:bg-white">
                <td className="border border-black p-1 text-[#155EEF] font-bold text-[11px]">មធ្យមភាគពិន្ទុប្រឡងឆមាស</td>
                <td className={`border border-black p-1 text-center ${processedData.sem1Avg > 0 && processedData.sem1Avg < 25 ? 'text-red-600 font-bold' : 'text-[#155EEF]'}`}>{processedData.sem1Total > 0 ? processedData.sem1Avg.toFixed(2) : ''}</td>
                <td className="border border-black p-1 text-center text-red-600 font-bold"></td>
                <td className={`border border-black p-1 text-center ${processedData.sem2Avg > 0 && processedData.sem2Avg < 25 ? 'text-red-600 font-bold' : 'text-[#155EEF]'}`}>{processedData.sem2Total > 0 ? processedData.sem2Avg.toFixed(2) : ''}</td>
                <td className="border border-black p-1 text-center text-red-600 font-bold"></td>
                <td className={`border border-black p-1 text-center ${processedData.annualAvg > 0 && processedData.annualAvg < 25 ? 'text-red-600 font-bold' : 'text-[#155EEF]'}`}>{processedData.annualTotal > 0 ? processedData.annualAvg.toFixed(2) : ''}</td>
                <td className="border border-black p-1 text-center text-red-600 font-bold"></td>
                <td className="border border-black p-1 border-b-0 border-t-0"></td>
              </tr>
              <tr className="bg-slate-50 print:bg-white">
                <td className="border border-black p-1 text-[#155EEF] font-bold text-[11px]">មធ្យមភាគពិន្ទុខែប្រចាំឆមាស</td>
                <td className={`border border-black p-1 text-center ${processedData.sem1Avg > 0 && processedData.sem1Avg < 25 ? 'text-red-600 font-bold' : 'text-[#155EEF]'}`} colSpan={2}>{processedData.sem1Total > 0 ? processedData.sem1Avg.toFixed(2) : ''}</td>
                <td className={`border border-black p-1 text-center ${processedData.sem2Avg > 0 && processedData.sem2Avg < 25 ? 'text-red-600 font-bold' : 'text-[#155EEF]'}`} colSpan={2}>{processedData.sem2Total > 0 ? processedData.sem2Avg.toFixed(2) : ''}</td>
                <td className={`border border-black p-1 text-center ${processedData.annualAvg > 0 && processedData.annualAvg < 25 ? 'text-red-600 font-bold' : 'text-[#155EEF]'}`} colSpan={2}>{processedData.annualTotal > 0 ? processedData.annualAvg.toFixed(2) : ''}</td>
                <td className="border border-black p-1 border-b-0 border-t-0"></td>
              </tr>
              <tr className="bg-slate-50 print:bg-white">
                <td className="border border-black p-1 text-[#155EEF] font-bold text-[11px]">មធ្យមភាគពិន្ទុប្រចាំឆមាស</td>
                <td className={`border border-black p-1 text-center ${processedData.sem1Avg > 0 && processedData.sem1Avg < 25 ? 'text-red-600 font-bold' : 'text-[#155EEF]'}`} colSpan={2}>{processedData.sem1Total > 0 ? processedData.sem1Avg.toFixed(2) : ''}</td>
                <td className={`border border-black p-1 text-center ${processedData.sem2Avg > 0 && processedData.sem2Avg < 25 ? 'text-red-600 font-bold' : 'text-[#155EEF]'}`} colSpan={2}>{processedData.sem2Total > 0 ? processedData.sem2Avg.toFixed(2) : ''}</td>
                <td className={`border border-black p-1 text-center ${processedData.annualAvg > 0 && processedData.annualAvg < 25 ? 'text-red-600 font-bold' : 'text-[#155EEF]'}`} colSpan={2}>{processedData.annualTotal > 0 ? processedData.annualAvg.toFixed(2) : ''}</td>
                <td className="border border-black p-1 border-t-0"></td>
              </tr>

              {/* Section ខ Title */}
              <tr>
                <th colSpan={8} className="border border-black p-1 text-center text-[#155EEF] bg-slate-50 print:bg-white text-[13px] font-moul font-normal">
                  ខ/ ចំនួនអវត្តមានក្នុងការសិក្សា
                </th>
              </tr>
              <tr className="bg-slate-50 print:bg-white text-[#155EEF]">
                <th className="border border-black p-1 text-center">អវត្តមាន</th>
                <th className="border border-black p-1 text-center" colSpan={2}>ឆមាសទី ១</th>
                <th className="border border-black p-1 text-center" colSpan={2}>ឆមាសទី ២</th>
                <th className="border border-black p-1 text-center" colSpan={3}>ប្រចាំឆ្នាំ</th>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-[#155EEF]">-មានច្បាប់</td>
                <td className="border border-black p-1 text-center" colSpan={2}></td>
                <td className="border border-black p-1 text-center" colSpan={2}></td>
                <td className="border border-black p-1 text-center" colSpan={3}></td>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-[#155EEF]">-អត់ច្បាប់</td>
                <td className="border border-black p-1 text-center" colSpan={2}></td>
                <td className="border border-black p-1 text-center" colSpan={2}></td>
                <td className="border border-black p-1 text-center" colSpan={3}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* RIGHT COLUMN: Evaluations, Commendations, Remarks */}
        <div className="w-[43%] flex flex-col">
          <table className="w-full border-collapse border-2 border-black text-[12px] font-siemreap table-fixed h-full">
            <thead>
              {/* គ/ ការវាយតម្លៃ */}
              <tr>
                <th colSpan={4} className="border border-black p-1 text-center text-[#155EEF] bg-slate-50 print:bg-white text-[13px] font-moul font-normal">
                  គ/ ការវាយតម្លៃ
                </th>
              </tr>
              <tr className="bg-slate-50 print:bg-white text-[#155EEF]">
                <th className="border border-black p-1 text-center w-[120px]">ផ្នែកទាំង ៤</th>
                <th className="border border-black p-1 text-center">ឆមាសទី ១</th>
                <th className="border border-black p-1 text-center">ឆមាសទី ២</th>
                <th className="border border-black p-1 text-center">ប្រចាំឆ្នាំ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1 pl-2 text-[#155EEF]">១- ការសិក្សា</td>
                <td className="border border-black p-1 text-center text-[#155EEF]"></td>
                <td className="border border-black p-1 text-center text-[#155EEF]"></td>
                <td className="border border-black p-1 text-center text-[#155EEF]"></td>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-[#155EEF]">២- សីលធម៌រស់នៅ</td>
                <td className="border border-black p-1 text-center text-[#155EEF]"></td>
                <td className="border border-black p-1 text-center text-[#155EEF]"></td>
                <td className="border border-black p-1 text-center text-[#155EEF]"></td>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-[#155EEF]">៣- ពលកម្ម-បង្កបង្កើនផល</td>
                <td className="border border-black p-1 text-center text-[#155EEF]"></td>
                <td className="border border-black p-1 text-center text-[#155EEF]"></td>
                <td className="border border-black p-1 text-center text-[#155EEF]"></td>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-[#155EEF]">៤- សុខភាព-អនាម័យ</td>
                <td className="border border-black p-1 text-center text-[#155EEF]"></td>
                <td className="border border-black p-1 text-center text-[#155EEF]"></td>
                <td className="border border-black p-1 text-center text-[#155EEF]"></td>
              </tr>

              {/* ឃ/ ការសរសើរ */}
              <tr>
                <th colSpan={4} className="border border-black p-1 text-center text-[#155EEF] bg-slate-50 print:bg-white text-[13px] font-moul font-normal">
                  ឃ/ ការសរសើរ
                </th>
              </tr>
              <tr className="bg-slate-50 print:bg-white text-[#155EEF]">
                <th className="border border-black p-1 text-center">បានទទួលការសរសើរ</th>
                <th className="border border-black p-1 text-center">ឆមាសទី ១</th>
                <th className="border border-black p-1 text-center">ឆមាសទី ២</th>
                <th className="border border-black p-1 text-center">ប្រចាំឆ្នាំ</th>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-[#155EEF]">-បណ្ណសរសើរចំនួន៖</td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-[#155EEF]">-លិខិតសរសើរ៖</td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-[#155EEF]">-សក្ខីបណ្ណលើកទឹកចិត្ត៖</td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
              </tr>

              {/* ង/ លទ្ធផលនៃការប្រឡង */}
              <tr>
                <td colSpan={4} className="border-x-0 border-t border-b border-black p-2 align-top text-center bg-white print:bg-white">
                   <div className="flex flex-col justify-between min-h-[90px] w-full">
                     <div className="flex flex-col gap-1">
                       <p className="text-[#155EEF] text-[13px] font-moul">ង/ លទ្ធផលនៃការប្រឡងបញ្ចប់ភូមិសិក្សា (ជាប់ ឬ ធ្លាក់)</p>
                       <p className="text-[#155EEF] text-[14px] font-bold">ត្រូវបានរៀនត្រួតថ្នាក់ទី {classInfo.name}</p>
                     </div>
                     <p className="text-[#155EEF] text-[12px] w-full text-center mt-3">មណ្ឌលប្រឡង................................................ (ខេត្ត................................)បន្ទប់...................លេខតុ........................</p>
                   </div>
                </td>
              </tr>

              {/* ច/ មូលវិចារ */}
              <tr>
                <td colSpan={4} className="border-x-0 border-t border-b-0 border-black p-2 align-top text-center bg-white print:bg-white h-full">
                   <div className="flex flex-col justify-between min-h-[220px] w-full h-full">
                     <div className="flex flex-col gap-1">
                       <p className="text-[#155EEF] text-[13px] font-moul">ច/ មូលវិចារ គ្រូបន្ទុកថ្នាក់</p>
                       <p className="text-[#155EEF] text-[13px]">លទ្ធផលការសិក្សារបស់សិស្សទទួលបាននិទ្ទេស <span className={processedData.annualAvg > 0 && processedData.annualAvg < 25 ? 'text-red-600 font-bold' : 'font-bold'}>{
                         processedData.annualAvg === 0 ? '.............' : 
                         (processedData.annualAvg < 25 ? 'ខ្សោយ' : 
                         (processedData.annualAvg < 32.5 ? 'មធ្យម' : 
                         (processedData.annualAvg < 40 ? 'មធ្យមល្អ' : 
                         (processedData.annualAvg < 45 ? 'ល្អ' : 'ល្អប្រសើរ'))))
                       }</span></p>
                     </div>
                     
                     <div className="flex flex-col items-center justify-center flex-grow py-4">
                       <p className="text-red-600 text-[14px] font-moul">{teacherName}</p>
                     </div>
                     
                     <div className="flex flex-col gap-1 mt-auto">
                       <p className="text-[#155EEF] text-[12px]">ថ្ងៃទី២៦ ខែកញ្ញា ឆ្នាំ២០២៦</p>
                       <p className="text-[#155EEF] font-bold text-[12px]">បានឃើញ និងឯកភាព<br/>នាយកសាលា</p>
                       <p className="text-[#155EEF] text-[12px] mt-6">ថ្ងៃទី២៦ ខែកញ្ញា ឆ្នាំ២០២៦</p>
                     </div>
                   </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
