import { Injectable, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { DatabaseService, Professor } from '../database/database.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as path from 'path';

@Injectable()
export class ExcelService {
  private readonly logger = new Logger(ExcelService.name);

  constructor(private readonly dbService: DatabaseService) {}

  public async processExcelFile(filePath: string): Promise<number> {
    try {
      const workbook = xlsx.readFile(filePath);
      let newProfessorsCount = 0;
      const allProfs = await this.dbService.getProfessors();

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length === 0) continue;

        const extracted = this.extractProfessorsFromRows(rows, sheetName, filePath);
        
        for (const prof of extracted) {
          const { level, classNames } = this.standardizeLevelAndClasses(
            prof.level || 'Unknown',
            prof.className || 'Unknown',
            filePath,
            sheetName
          );

          for (const clsName of classNames) {
            const name = (prof.name || '').trim();
            const course = (prof.course || '').trim();
            if (!name) continue;

            const exists = allProfs.find(
              p => p.name === name && 
                   p.course === course && 
                   p.className === clsName &&
                   p.level === level
            );

            if (!exists) {
              const hashInput = `${name}|${course}|${level}|${clsName}`;
              const id = crypto.createHash('sha256').update(hashInput).digest('hex');
              
              allProfs.push({
                id,
                name,
                course,
                level,
                className: clsName,
                email: prof.email,
                contact: prof.contact,
              });
              newProfessorsCount++;
            }
          }
        }
      }

      await this.dbService.saveProfessors(allProfs);
      return newProfessorsCount;
    } catch (error: any) {
      this.logger.error(`Error processing file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  private standardizeLevelAndClasses(
    parsedLevel: string,
    parsedClass: string,
    filePath: string,
    sheetName: string
  ): { level: string, classNames: string[] } {
    const fn = path.basename(filePath).toUpperCase();
    const sn = sheetName.toUpperCase();
    const cl = (parsedClass || '').toUpperCase();
    const lvl = (parsedLevel || '').toUpperCase();

    const combined = `${fn} ${sn} ${cl} ${lvl}`;

    // 1. Determine Level
    let level = 'Unknown';
    if (combined.includes('LICENCE 1') || combined.includes('L1') || fn.includes('LICENCE 1') || sn.startsWith('L1')) {
      level = 'LICENCE 1';
    } else if (combined.includes('LICENCE 2') || combined.includes('L2') || fn.includes('LICENCE 2') || fn.includes('LICENCE2') || sn.startsWith('L2')) {
      level = 'LICENCE 2';
    } else if (combined.includes('LICENCE 3') || combined.includes('L3') || fn.includes('LICENCE 3') || sn.startsWith('L3') || fn.includes('INFOS ENSEIGNANT')) {
      level = 'LICENCE 3';
    } else if (combined.includes('MASTER') || fn.includes('MASTER')) {
      level = 'MASTER';
    }

    // 2. Determine classNames (filières)
    const classNames: string[] = [];
    if (level === 'MASTER') {
      const parts = cl.split(/[,\/&]/).map(s => s.trim());
      for (const part of parts) {
        if (part && part !== 'OPTION 1') {
          classNames.push(part);
        } else if (part === 'OPTION 1') {
          classNames.push('Option 1');
        }
      }
      if (classNames.length === 0) {
        classNames.push('MASTER');
      }
    } else {
      // For licence, match standard list: ASSRI, MIAGE, SEG, SEA, SJAP, 3EA
      if (combined.includes('3EA')) {
        classNames.push('3EA');
      }
      if (combined.includes('ASSRI') || combined.includes('SÉCURITÉ') || combined.includes('SECURITE')) {
        classNames.push('ASSRI');
      }
      if (combined.includes('MIAGE')) {
        classNames.push('MIAGE');
      }
      if (combined.includes('SEG') || combined.includes('GESTION') || combined.includes('ECONOMIE') || combined.includes('ÉCONOMIE')) {
        classNames.push('SEG');
      }
      if (combined.includes('SEA') && !combined.includes('RESEARCH') && !combined.includes('RESEAU') && !combined.includes('RÉSEAU')) {
        classNames.push('SEA');
      }
      if (combined.includes('SJAP') || combined.includes('DROIT') || combined.includes('JURIDIQUE')) {
        classNames.push('SJAP');
      }

      // Fallback
      if (classNames.length === 0) {
        if (fn.includes('ASSRI') || sn.includes('ASSRI')) classNames.push('ASSRI');
        else if (fn.includes('MIAGE') || sn.includes('MIAGE')) classNames.push('MIAGE');
        else if (fn.includes('SEG') || sn.includes('SEG')) classNames.push('SEG');
        else if (fn.includes('SEA') || sn.includes('SEA')) classNames.push('SEA');
        else if (fn.includes('SJAP') || sn.includes('SJAP')) classNames.push('SJAP');
        else if (fn.includes('3EA') || sn.includes('3EA')) classNames.push('3EA');
        else classNames.push('Unknown');
      }
    }

    const uniqueClassNames = Array.from(new Set(classNames));
    return { level, classNames: uniqueClassNames };
  }

  private extractProfessorsFromRows(rows: any[][], sheetName: string, filePath: string): Partial<Professor>[] {
    const cleanRows = rows.map(row => (row || []).map(c => c ? String(c).trim() : ''));
    
    if (cleanRows[0] && cleanRows[0].includes('Timestamp') && cleanRows[0].includes('Email Address')) {
      return this.parseFormResponses(cleanRows);
    }

    if (cleanRows[0] && cleanRows[0].includes('MATIERES') && cleanRows[0].includes('FILIERE')) {
      return this.parseL3Format(cleanRows);
    }

    const isClassic = cleanRows.slice(0, 6).some(r => r?.some(c => c?.includes('Parcours') || c?.includes('Niveau')));
    if (isClassic) {
      return this.parseClassicFormat(cleanRows, sheetName, filePath);
    }

    let headerRowIdx = cleanRows.findIndex(r => r?.some(c => c?.toLowerCase()?.includes("intitulé de l'ecue") || c?.toLowerCase()?.includes('nom et prenom') || c?.toLowerCase()?.includes('nom & prenoms')));
    if (headerRowIdx !== -1) {
      return this.parseFallbackFormat(cleanRows, headerRowIdx, sheetName);
    }

    this.logger.warn(`Could not determine format for sheet ${sheetName}`);
    return [];
  }

  private parseFormResponses(rows: string[][]): Partial<Professor>[] {
    const profs: Partial<Professor>[] = [];
    const headers = rows[0].map(h => h?.toLowerCase() || '');
    const nameIdx = headers.findIndex(h => h?.includes('nom'));
    const courseIdx = headers.findIndex(h => h?.includes('unit'));
    const classIdx = headers.findIndex(h => h?.includes('fili'));
    const emailIdx = headers.findIndex(h => h?.includes('email'));
    const contactIdx = headers.findIndex(h => h?.includes('contact'));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[nameIdx]) continue;
      profs.push({
        name: row[nameIdx],
        course: row[courseIdx] || 'Unknown',
        className: row[classIdx] || 'Unknown',
        level: 'MASTER',
        email: emailIdx !== -1 ? row[emailIdx] : undefined,
        contact: contactIdx !== -1 ? row[contactIdx] : undefined,
      });
    }
    return profs;
  }

  private parseL3Format(rows: string[][]): Partial<Professor>[] {
    const profs: Partial<Professor>[] = [];
    const headers = rows[0].map(h => h?.toLowerCase() || '');
    const nomIdx = headers.findIndex(h => h === 'nom');
    const prenomIdx = headers.findIndex(h => h === 'prenom(s)');
    const courseIdx = headers.findIndex(h => h === 'matieres');
    const classIdx = headers.findIndex(h => h === 'filiere');
    const contactIdx = headers.findIndex(h => h === 'contact');
    const emailIdx = headers.findIndex(h => h === 'email');

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[nomIdx]) continue;
      const fullName = `${row[nomIdx]} ${row[prenomIdx] || ''}`.trim();
      
      const courses = row[courseIdx] ? row[courseIdx].split(',').map(s => s.trim()) : ['Unknown'];
      const classes = row[classIdx] ? row[classIdx].split(',').map(s => s.trim()) : ['Unknown'];

      for (const course of courses) {
        for (const cls of classes) {
          profs.push({
            name: fullName,
            course: course,
            className: cls,
            level: 'LICENCE 3',
            contact: contactIdx !== -1 ? row[contactIdx] : undefined,
            email: emailIdx !== -1 ? row[emailIdx] : undefined,
          });
        }
      }
    }
    return profs;
  }

  private parseClassicFormat(rows: string[][], sheetName: string, filePath: string): Partial<Professor>[] {
    const profs: Partial<Professor>[] = [];
    let level = 'Unknown';
    let className = 'Unknown';
    
    for (let i = 0; i < 6; i++) {
      const row = rows[i];
      if (!row) continue;
      const parcoursIdx = row.findIndex(c => c?.toLowerCase() === 'parcours');
      if (parcoursIdx !== -1 && row[parcoursIdx + 1]) className = row[parcoursIdx + 1];
      const niveauIdx = row.findIndex(c => c?.toLowerCase() === 'niveau');
      if (niveauIdx !== -1 && row[niveauIdx + 1]) level = row[niveauIdx + 1];
    }
    
    if (level === 'Unknown' || className === 'Unknown') {
      const name = filePath.toUpperCase();
      if (name.includes('LICENCE 1')) level = 'LICENCE 1';
      else if (name.includes('LICENCE 2')) level = 'LICENCE 2';
      else if (name.includes('LICENCE 3')) level = 'LICENCE 3';
      else if (name.includes('MASTER')) level = 'MASTER';
    }

    const headerIdx = rows.findIndex(r => r?.some(c => {
      const val = c ? String(c).toLowerCase() : '';
      return val.includes('nom et prenom') || val.includes('nom & prenoms') || val.includes("intitulé de l'ecue") || val.includes('enseignant');
    }));
    if (headerIdx !== -1) {
      const headers = rows[headerIdx].map(h => h ? String(h).toLowerCase() : '');
      const nameIdx = headers.findIndex(h => h?.includes('nom et prenom') || h?.includes('nom & prenoms') || h?.includes('enseignant'));
      const courseIdx = headers.findIndex(h => h?.includes("intitulé de l'ecue") || h?.includes('eléments constitutifs') || h?.includes('elments constitutifs') || h?.includes("intitulé de l'ue"));
      const contactIdx = headers.findIndex(h => h?.includes('contact') || h?.includes('numero') || h?.includes('téléphone') || h?.includes('telephone'));
      const emailIdx = headers.findIndex(h => h?.includes('email') || h?.includes('adresse mail') || h?.includes('mails') || h?.includes('mail'));

      if (nameIdx !== -1 && courseIdx !== -1) {
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (row && row[nameIdx] && row[courseIdx] && String(row[nameIdx]).trim() !== '') {
            if (String(row[nameIdx]).toLowerCase().includes('total')) continue;
            
            profs.push({
              name: String(row[nameIdx]).trim(),
              course: String(row[courseIdx]).trim(),
              className: className !== 'Unknown' ? className : sheetName,
              level: level,
              contact: contactIdx !== -1 ? row[contactIdx] : undefined,
              email: emailIdx !== -1 ? row[emailIdx] : undefined,
            });
          }
        }
      }
    }
    return profs;
  }

  private parseFallbackFormat(rows: string[][], headerIdx: number, sheetName: string): Partial<Professor>[] {
    const profs: Partial<Professor>[] = [];
    if (!rows[headerIdx]) return profs;
    const headers = rows[headerIdx].map(h => h ? String(h).toLowerCase() : '');
    
    const nameIdx = headers.findIndex(h => h?.includes('nom et prenom') || h?.includes('nom & prenoms') || h?.includes('ensignant'));
    const courseIdx = headers.findIndex(h => h?.includes("intitulé de l'ecue"));
    const emailIdx = headers.findIndex(h => h?.includes('adresse mail') || h?.includes('email') || h?.includes('mails'));
    const contactIdx = headers.findIndex(h => h?.includes('contact') || h?.includes('tellephone'));

    for (let i = headerIdx + 2; i < rows.length; i++) {
      const row = rows[i];
      if (row && nameIdx !== -1 && row[nameIdx] && courseIdx !== -1 && row[courseIdx]) {
        profs.push({
          name: String(row[nameIdx]).trim(),
          course: String(row[courseIdx]).trim(),
          className: sheetName,
          level: 'Unknown',
          email: emailIdx !== -1 ? row[emailIdx] : undefined,
          contact: contactIdx !== -1 ? row[contactIdx] : undefined,
        });
      }
    }
    return profs;
  }
}
