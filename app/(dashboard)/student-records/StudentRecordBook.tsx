import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Classroom, Student } from '@/types';
import { Loader2 } from 'lucide-react';
import { CURRICULUM_SCHEMAS } from '@/lib/curriculum';
import { computeSummaryGrades } from '@/lib/grade-calculations';

interface Props {
  classInfo: Classroom;
  student: Student;
  allStudents: Student[];
}

export default function StudentRecordBook({ classInfo, student, allStudents }: Props) {
  const [gradesData, setGradesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Use curriculum schema
  const schemaId = classInfo.grade.startsWith('10') || classInfo.grade.startsWith('11') || classInfo.grade.startsWith('12') 
    ? (classInfo.grade.includes('A') || classInfo.grade.includes('B') || classInfo.grade.includes('C') ? 'upper-sec-sci' : 'upper-sec-art')
    : 'lower-sec';
  const schema = CURRICULUM_SCHEMAS[schemaId] || CURRICULUM_SCHEMAS['lower-sec'];

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch ALL grades for the class to compute ranks
        const { data } = await supabase
          .from('grades')
          .select('*')
          .eq('class_id', classInfo.id);

        if (data) {
          setGradesData(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [classInfo.id]);

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


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#155EEF]" />
        <p className="mt-4 text-sm font-bold">កំពុងទាញយកទិន្នន័យ (Loading...)</p>
      </div>
    );
  }

  return (
    <div className="p-8 print:p-0 w-[1122px] shrink-0 bg-white shadow-[0_0_40px_rgba(0,0,0,0.1)] rounded-sm border border-slate-200/50 print:border-none print:shadow-none print:rounded-none print:w-full">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        <div className="text-left w-1/3">
          <h2 className="text-xs font-khmer font-bold">ក្រសួងអប់រំ យុវជន និងកីឡា</h2>
          <h2 className="text-xs font-khmer font-bold">មន្ទីរអប់រំ យុវជន និងកីឡា ខេត្តព្រៃវែង</h2>
          <h2 className="text-xs font-khmer font-bold">ការិយាល័យអប់រំ យុវជន និងកីឡា ស្រុកពាមរក៍</h2>
          <h2 className="text-xs font-khmer font-bold">សាលារៀន ហ៊ុនសែន ពោធិរៀង</h2>
        </div>
        <div className="text-center w-1/3">
          <h2 className="text-sm font-khmer font-bold">ព្រះរាជាណាចក្រកម្ពុជា</h2>
          <h3 className="text-sm font-khmer font-bold">ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
          <div className="mt-1 text-center text-xs">🙣🙧🙙★🙛🙤🙢</div>
        </div>
        <div className="text-right w-1/3 text-xs flex flex-col items-end gap-1">
          <p className="font-khmer">ឆ្នាំសិក្សា៖ ២០២៥-២០២៦</p>
          <p className="font-khmer">ថ្នាក់ទី៖ <span className="font-bold">{classInfo.name}</span></p>
        </div>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-xl font-khmer font-black">សៀវភៅសិក្ខាគារិក</h1>
        <div className="flex justify-center gap-8 mt-2 text-sm font-khmer font-bold">
          <p>គោត្តនាម និងនាមសិស្ស៖ <span className="text-blue-700 print:text-black">{student.full_name}</span></p>
          <p>អត្តលេខ៖ {student.student_id_number || '....................'}</p>
          <p>ភេទ៖ {student.gender === 'M' ? 'ប្រុស' : 'ស្រី'}</p>
        </div>
      </div>

      <div className="flex gap-4">
        {/* LEFT COLUMN: Study Results & Absences */}
        <div className="w-3/5 flex flex-col">
          <table className="w-full border-collapse border border-black text-[12px] font-khmer table-fixed">
            <thead>
              {/* Section ក Title */}
              <tr>
                <th colSpan={8} className="border border-black p-1.5 text-center text-blue-700 font-bold bg-slate-50 print:bg-white text-sm">
                  ក/ លទ្ធផលនៃការសិក្សា
                </th>
              </tr>
              <tr className="bg-slate-50 print:bg-white text-blue-700">
                <th className="border border-black p-1 text-center w-[120px]" rowSpan={2}>មុខវិជ្ជា</th>
                <th className="border border-black p-1 text-center" colSpan={2}>ឆមាសទី១</th>
                <th className="border border-black p-1 text-center" colSpan={2}>ឆមាសទី២</th>
                <th className="border border-black p-1 text-center" colSpan={2}>ប្រចាំឆ្នាំ</th>
                <th className="border border-black p-1 text-center w-20 leading-tight" rowSpan={2}>មូលវិចារហត្ថលេខា<br/>និងឈ្មោះគ្រូ</th>
              </tr>
              <tr className="bg-slate-50 print:bg-white text-blue-700">
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
                    <td className="border border-black p-1 text-blue-700">{sub.label}</td>
                    <td className="border border-black p-1 text-center text-blue-700">{stat.sem1 !== null ? stat.sem1.toFixed(2) : ''}</td>
                    <td className="border border-black p-1 text-center text-red-600 font-bold">{stat.sem1Rank !== null ? stat.sem1Rank : ''}</td>
                    <td className="border border-black p-1 text-center text-blue-700">{stat.sem2 !== null ? stat.sem2.toFixed(2) : ''}</td>
                    <td className="border border-black p-1 text-center text-red-600 font-bold">{stat.sem2Rank !== null ? stat.sem2Rank : ''}</td>
                    <td className="border border-black p-1 text-center text-blue-700">{stat.annual !== null ? stat.annual.toFixed(2) : ''}</td>
                    <td className="border border-black p-1 text-center text-red-600 font-bold">{stat.annualRank !== null ? stat.annualRank : ''}</td>
                    <td className="border border-black p-1 text-center"></td>
                  </tr>
                );
              })}
              {/* Extra Subject Row to match image */}
              <tr>
                <td className="border border-black p-1 text-blue-700">ព័ត៌មានវិទ្យា</td>
                <td className="border border-black p-1 text-center text-blue-700"></td><td className="border border-black p-1 text-center text-red-600 font-bold"></td>
                <td className="border border-black p-1 text-center text-blue-700"></td><td className="border border-black p-1 text-center text-red-600 font-bold"></td>
                <td className="border border-black p-1 text-center text-blue-700"></td><td className="border border-black p-1 text-center text-red-600 font-bold"></td>
                <td className="border border-black p-1 text-center text-blue-700"></td>
              </tr>
              
              {/* The 4 Average Rows */}
              <tr className="bg-slate-50 print:bg-white">
                <td className="border border-black p-1 text-blue-700 font-bold text-[11px]">សរុបពិន្ទុប្រឡងឆមាស</td>
                <td className="border border-black p-1 text-center text-blue-700">{processedData.sem1Total > 0 ? processedData.sem1Total : ''}</td>
                <td className="border border-black p-1 text-center text-red-600 font-bold"></td>
                <td className="border border-black p-1 text-center text-blue-700">{processedData.sem2Total > 0 ? processedData.sem2Total : ''}</td>
                <td className="border border-black p-1 text-center text-red-600 font-bold"></td>
                <td className="border border-black p-1 text-center text-blue-700">{processedData.annualTotal > 0 ? processedData.annualTotal : ''}</td>
                <td className="border border-black p-1 text-center text-red-600 font-bold"></td>
                <td className="border border-black p-1 border-b-0"></td>
              </tr>
              <tr className="bg-slate-50 print:bg-white">
                <td className="border border-black p-1 text-blue-700 font-bold text-[11px]">មធ្យមភាគពិន្ទុប្រឡងឆមាស</td>
                <td className="border border-black p-1 text-center text-blue-700">{processedData.sem1Total > 0 ? processedData.sem1Avg.toFixed(2) : ''}</td>
                <td className="border border-black p-1 text-center text-red-600 font-bold"></td>
                <td className="border border-black p-1 text-center text-blue-700">{processedData.sem2Total > 0 ? processedData.sem2Avg.toFixed(2) : ''}</td>
                <td className="border border-black p-1 text-center text-red-600 font-bold"></td>
                <td className="border border-black p-1 text-center text-blue-700">{processedData.annualTotal > 0 ? processedData.annualAvg.toFixed(2) : ''}</td>
                <td className="border border-black p-1 text-center text-red-600 font-bold"></td>
                <td className="border border-black p-1 border-b-0 border-t-0"></td>
              </tr>
              <tr className="bg-slate-50 print:bg-white">
                <td className="border border-black p-1 text-blue-700 font-bold text-[11px]">មធ្យមភាគពិន្ទុប្រចាំខែឆមាស</td>
                <td className="border border-black p-1 text-center text-blue-700" colSpan={2}></td>
                <td className="border border-black p-1 text-center text-blue-700" colSpan={2}></td>
                <td className="border border-black p-1 text-center text-blue-700" colSpan={2}></td>
                <td className="border border-black p-1 border-b-0 border-t-0"></td>
              </tr>
              <tr className="bg-slate-50 print:bg-white">
                <td className="border border-black p-1 text-blue-700 font-bold text-[11px]">មធ្យមភាគពិន្ទុប្រចាំឆមាស</td>
                <td className="border border-black p-1 text-center text-blue-700" colSpan={2}></td>
                <td className="border border-black p-1 text-center text-blue-700" colSpan={2}></td>
                <td className="border border-black p-1 text-center text-blue-700" colSpan={2}></td>
                <td className="border border-black p-1 border-t-0"></td>
              </tr>

              {/* Section ខ Title */}
              <tr>
                <th colSpan={8} className="border border-black p-1.5 text-center text-blue-700 font-bold bg-slate-50 print:bg-white text-sm">
                  ខ/ ចំនួនអវត្តមានក្នុងការសិក្សា
                </th>
              </tr>
              <tr className="bg-slate-50 print:bg-white text-blue-700">
                <th className="border border-black p-1 text-center">អវត្តមាន</th>
                <th className="border border-black p-1 text-center" colSpan={2}>ឆមាសទី ១</th>
                <th className="border border-black p-1 text-center" colSpan={2}>ឆមាសទី ២</th>
                <th className="border border-black p-1 text-center" colSpan={3}>ប្រចាំឆ្នាំ</th>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-blue-700">-មានច្បាប់</td>
                <td className="border border-black p-1 text-center" colSpan={2}></td>
                <td className="border border-black p-1 text-center" colSpan={2}></td>
                <td className="border border-black p-1 text-center" colSpan={3}></td>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-blue-700">-អត់ច្បាប់</td>
                <td className="border border-black p-1 text-center" colSpan={2}></td>
                <td className="border border-black p-1 text-center" colSpan={2}></td>
                <td className="border border-black p-1 text-center" colSpan={3}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* RIGHT COLUMN: Evaluations, Commendations, Remarks */}
        <div className="w-2/5 flex flex-col">
          <table className="w-full border-collapse border border-black text-[12px] font-khmer">
            <thead>
              {/* គ/ ការវាយតម្លៃ */}
              <tr>
                <th colSpan={4} className="border border-black p-1.5 text-center text-blue-700 font-bold bg-slate-50 print:bg-white text-sm">
                  គ/ ការវាយតម្លៃ
                </th>
              </tr>
              <tr className="bg-slate-50 print:bg-white text-blue-700">
                <th className="border border-black p-1 text-center w-[120px]">ផ្នែកទាំង ៤</th>
                <th className="border border-black p-1 text-center">ឆមាសទី ១</th>
                <th className="border border-black p-1 text-center">ឆមាសទី ២</th>
                <th className="border border-black p-1 text-center">ប្រចាំឆ្នាំ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1 pl-2 text-blue-700">១- ការសិក្សា</td>
                <td className="border border-black p-1 text-center text-blue-700"></td>
                <td className="border border-black p-1 text-center text-blue-700"></td>
                <td className="border border-black p-1 text-center text-blue-700"></td>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-blue-700">២- សីលធម៌រស់នៅ</td>
                <td className="border border-black p-1 text-center text-blue-700"></td>
                <td className="border border-black p-1 text-center text-blue-700"></td>
                <td className="border border-black p-1 text-center text-blue-700"></td>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-blue-700">៣- ពលកម្ម-បង្កបង្កើនផល</td>
                <td className="border border-black p-1 text-center text-blue-700"></td>
                <td className="border border-black p-1 text-center text-blue-700"></td>
                <td className="border border-black p-1 text-center text-blue-700"></td>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-blue-700">៤- សុខភាព-អនាម័យ</td>
                <td className="border border-black p-1 text-center text-blue-700"></td>
                <td className="border border-black p-1 text-center text-blue-700"></td>
                <td className="border border-black p-1 text-center text-blue-700"></td>
              </tr>

              {/* ឃ/ ការសរសើរ */}
              <tr>
                <th colSpan={4} className="border border-black p-1.5 text-center text-blue-700 font-bold bg-slate-50 print:bg-white text-sm">
                  ឃ/ ការសរសើរ
                </th>
              </tr>
              <tr className="bg-slate-50 print:bg-white text-blue-700">
                <th className="border border-black p-1 text-center">បានទទួលការសរសើរ</th>
                <th className="border border-black p-1 text-center">ឆមាសទី ១</th>
                <th className="border border-black p-1 text-center">ឆមាសទី ២</th>
                <th className="border border-black p-1 text-center">ប្រចាំឆ្នាំ</th>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-blue-700">-បណ្ណសរសើរចំនួន៖</td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-blue-700">-លិខិតសរសើរ៖</td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
              </tr>
              <tr>
                <td className="border border-black p-1 pl-2 text-blue-700">-សក្ខីបណ្ណលើកទឹកចិត្ត៖</td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
              </tr>

              {/* ង/ លទ្ធផលនៃការប្រឡង */}
              <tr>
                <th colSpan={4} className="border border-black p-1.5 text-center text-blue-700 font-bold bg-slate-50 print:bg-white text-sm">
                  ង/ លទ្ធផលនៃការប្រឡងបញ្ចប់ភូមិសិក្សា (ជាប់ ឬ ធ្លាក់)
                </th>
              </tr>
              <tr>
                <td colSpan={4} className="border border-black p-2 h-20 relative align-top text-center">
                   <p className="text-blue-700 font-bold mt-1">ត្រូវបានរៀនត្រួតថ្នាក់ទី .............</p>
                   <p className="text-blue-700 text-[11px] absolute bottom-2 left-0 w-full text-center">មណ្ឌលប្រឡង...................................... (ខេត្ត......................................)<br/>បន្ទប់............លេខតុ..........</p>
                </td>
              </tr>

              {/* ច/ មូលវិចារ */}
              <tr>
                <th colSpan={4} className="border border-black p-1.5 text-center text-blue-700 font-bold bg-slate-50 print:bg-white text-sm">
                  ច/ មូលវិចារ គ្រូបន្ទុកថ្នាក់
                </th>
              </tr>
              <tr>
                <td colSpan={4} className="border border-black p-2 h-[220px] relative align-top text-center">
                   <p className="text-blue-700 mt-1">លទ្ធផលការសិក្សារបស់សិស្សទទួលបាននិទ្ទេស <span className="font-bold text-red-600">.............</span></p>
                   
                   <p className="text-red-600 font-bold mt-8">................................................</p>
                   
                   <p className="text-blue-700 mt-8">ថ្ងៃទី...........ខែ..............ឆ្នាំ២០២....</p>
                   <p className="text-blue-700 font-bold mt-1">មូលវិចារ នាយក/នាយិកា</p>
                   
                   <p className="text-blue-700 absolute bottom-4 w-full left-0 text-center">ថ្ងៃទី...........ខែ..............ឆ្នាំ២០២....</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
