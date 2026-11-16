import { SpecialtyResponse, CreateSpecialtyInput, UpdateSpecialtyInput } from './specialties.types';
export declare class SpecialtiesService {
    private formatRow;
    getSpecialties(): Promise<SpecialtyResponse[]>;
    getSpecialtyById(id: string): Promise<SpecialtyResponse>;
    createSpecialty(input: CreateSpecialtyInput): Promise<SpecialtyResponse>;
    updateSpecialty(id: string, input: UpdateSpecialtyInput): Promise<SpecialtyResponse>;
    deleteSpecialty(id: string): Promise<void>;
}
export declare const specialtiesService: SpecialtiesService;
//# sourceMappingURL=specialties.service.d.ts.map