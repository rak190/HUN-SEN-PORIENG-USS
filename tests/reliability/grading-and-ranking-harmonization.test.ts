import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  calculateScale50Grade,
  calculateGradeLetter,
  computeStudentRank,
  assignGradeRanks
} from '../../lib/domain/grading';

describe('Grading and Ranking Harmonization Suite (MoEYS Standard)', () => {
  const rootDir = process.cwd();

  it('Scenario 1: MoEYS Scale 50 to Grade Letter (A-F) exact boundary verification', () => {
    // Grade A: >= 90% (>= 45.0 / 50)
    assert.equal(calculateScale50Grade(50.0).letter, 'A');
    assert.equal(calculateScale50Grade(45.0).letter, 'A');
    assert.equal(calculateScale50Grade(45.0).mentionKh, 'ល្អប្រសើរ (Excellent)');

    // Grade B: 80% - 89.99% (40.0 - 44.99 / 50)
    // CRITICAL: 42.5/50 is 85.0%, which is Grade B under MoEYS, NEVER Grade A!
    assert.equal(calculateScale50Grade(44.9).letter, 'B');
    assert.equal(calculateScale50Grade(43.0).letter, 'B');
    assert.equal(calculateScale50Grade(42.5).letter, 'B');
    assert.equal(calculateScale50Grade(40.0).letter, 'B');
    assert.equal(calculateScale50Grade(40.0).mentionKh, 'ល្អណាស់ (Very Good)');

    // Grade C: 70% - 79.99% (35.0 - 39.99 / 50)
    assert.equal(calculateScale50Grade(39.9).letter, 'C');
    assert.equal(calculateScale50Grade(35.0).letter, 'C');
    assert.equal(calculateScale50Grade(35.0).mentionKh, 'ល្អ (Good)');

    // Grade D: 60% - 69.99% (30.0 - 34.99 / 50)
    assert.equal(calculateScale50Grade(34.9).letter, 'D');
    assert.equal(calculateScale50Grade(30.0).letter, 'D');
    assert.equal(calculateScale50Grade(30.0).mentionKh, 'ល្អបង្គួរ (Fairly Good)');

    // Grade E: 50% - 59.99% (25.0 - 29.99 / 50)
    assert.equal(calculateScale50Grade(29.9).letter, 'E');
    assert.equal(calculateScale50Grade(25.0).letter, 'E');
    assert.equal(calculateScale50Grade(25.0).mentionKh, 'មធ្យម (Pass)');

    // Grade F: < 50% (< 25.0 / 50)
    assert.equal(calculateScale50Grade(24.9).letter, 'F');
    assert.equal(calculateScale50Grade(10.0).letter, 'F');
    assert.equal(calculateScale50Grade(0.0).letter, 'F');
    assert.equal(calculateScale50Grade(0.0).mentionKh, 'ធ្លាក់ (Fail)');
  });

  it('Scenario 2: Competition ranking tie handling (1, 1, 3) verification', () => {
    const scores = [500, 480, 480, 450, 400];

    // computeStudentRank
    assert.equal(computeStudentRank(500, scores), 1);
    assert.equal(computeStudentRank(480, scores), 2);
    // Student with 450 has 3 students above them (500, 480, 480), so rank is 4 (not 3!)
    assert.equal(computeStudentRank(450, scores), 4);
    assert.equal(computeStudentRank(400, scores), 5);

    // Two students tied for 1st place
    const topTieScores = [490, 490, 450];
    assert.equal(computeStudentRank(490, topTieScores), 1);
    assert.equal(computeStudentRank(450, topTieScores), 3);

    // assignGradeRanks with custom accessor
    const students = [
      { name: 'Sok', totalScore: 490 },
      { name: 'Sao', totalScore: 490 },
      { name: 'Dara', totalScore: 450 }
    ];
    const ranked = assignGradeRanks(students, s => s.totalScore);
    assert.equal(ranked[0].rank, 1);
    assert.equal(ranked[1].rank, 1);
    assert.equal(ranked[2].rank, 3);
  });

  it('Scenario 3: Zero instances of legacy 42.5 hardcoding in app, components, and lib', () => {
    const searchDirs = [
      path.join(rootDir, 'app'),
      path.join(rootDir, 'components'),
      path.join(rootDir, 'lib')
    ];

    function checkDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert.ok(
            !content.includes('>= 42.5'),
            `File ${fullPath} contains legacy hardcoded '>= 42.5'!`
          );
        }
      }
    }

    for (const d of searchDirs) {
      checkDir(d);
    }
  });

  it('Scenario 4: All UI and API entry points use centralized grading and ranking functions', () => {
    // 1. grades page
    const gradesPage = fs.readFileSync(path.join(rootDir, 'app', '(dashboard)', 'grades', 'page.tsx'), 'utf8');
    assert.ok(gradesPage.includes('calculateScale50Grade'), 'grades page must use calculateScale50Grade');
    assert.ok(gradesPage.includes('assignGradeRanks'), 'grades page must use assignGradeRanks');

    // 2. report-cards page
    const reportCardsPage = fs.readFileSync(path.join(rootDir, 'app', '(dashboard)', 'report-cards', 'page.tsx'), 'utf8');
    assert.ok(reportCardsPage.includes('calculateScale50Grade'), 'report-cards page must use calculateScale50Grade');
    assert.ok(reportCardsPage.includes('assignGradeRanks'), 'report-cards page must use assignGradeRanks');

    // 3. HonorRollExportModal
    const honorRoll = fs.readFileSync(path.join(rootDir, 'components', 'grades', 'HonorRollExportModal.tsx'), 'utf8');
    assert.ok(honorRoll.includes('calculateScale50Grade'), 'HonorRollExportModal must use calculateScale50Grade');
    assert.ok(honorRoll.includes('assignGradeRanks'), 'HonorRollExportModal must use assignGradeRanks');

    // 4. GeipExportModal
    const geipModal = fs.readFileSync(path.join(rootDir, 'components', 'grades', 'GeipExportModal.tsx'), 'utf8');
    assert.ok(geipModal.includes('calculateScale50Grade'), 'GeipExportModal must use calculateScale50Grade');

    // 5. geip-export
    const geipExport = fs.readFileSync(path.join(rootDir, 'lib', 'geip-export.ts'), 'utf8');
    assert.ok(geipExport.includes('calculateScale50Grade'), 'geip-export must use calculateScale50Grade');

    // 6. broadcast-scores single & batch
    const broadcastSingle = fs.readFileSync(path.join(rootDir, 'app', 'api', 'admin', 'broadcast-scores', 'route.ts'), 'utf8');
    assert.ok(broadcastSingle.includes('assignGradeRanks'), 'broadcast-scores single route must use assignGradeRanks');

    const broadcastBatch = fs.readFileSync(path.join(rootDir, 'app', 'api', 'admin', 'broadcast-scores', 'batch', 'route.ts'), 'utf8');
    assert.ok(broadcastBatch.includes('assignGradeRanks'), 'broadcast-scores batch route must use assignGradeRanks');

    // 7. report-cards/image
    const reportCardImage = fs.readFileSync(path.join(rootDir, 'app', 'api', 'report-cards', 'image', 'route.tsx'), 'utf8');
    assert.ok(reportCardImage.includes('computeStudentRank'), 'report-cards/image route must use computeStudentRank');

    // 8. telegram webhook
    const telegramWebhook = fs.readFileSync(path.join(rootDir, 'app', 'api', 'telegram', 'webhook', 'route.ts'), 'utf8');
    assert.ok(telegramWebhook.includes('computeStudentRank'), 'telegram webhook route must use computeStudentRank');

    // 9. certificates page
    const certificatesPage = fs.readFileSync(path.join(rootDir, 'app', '(dashboard)', 'admin', 'certificates', 'page.tsx'), 'utf8');
    assert.ok(certificatesPage.includes('assignGradeRanks'), 'certificates page must use assignGradeRanks');
  });
});
