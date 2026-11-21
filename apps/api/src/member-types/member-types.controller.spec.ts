import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MemberTypesController } from './member-types.controller.js';
import { MemberTypesService } from './member-types.service.js';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface.js';

describe('MemberTypesController', () => {
  let controller: MemberTypesController;

  const tenantId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const memberTypeId = '33333333-3333-4333-8333-333333333333';
  const policyId = '44444444-4444-4444-8444-444444444444';

  const mockRequest = {
    user: {
      tenantId,
      userId,
      role: 'ADMIN',
    },
  } as unknown as AuthenticatedRequest;

  const memberTypesService = {
    create: vi.fn(),
    list: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    createPolicy: vi.fn(),
    updatePolicy: vi.fn(),
    deletePolicy: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new MemberTypesController(
      memberTypesService as unknown as MemberTypesService,
    );
  });

  it('delegates create to service', async () => {
    const dto = { name: 'Student', description: 'Student group' };
    memberTypesService.create.mockResolvedValue({ id: memberTypeId, ...dto });

    const result = await controller.create(dto, mockRequest);
    expect(memberTypesService.create).toHaveBeenCalledWith(tenantId, userId, dto);
    expect(result.id).toBe(memberTypeId);
  });

  it('delegates list to service', async () => {
    memberTypesService.list.mockResolvedValue([{ id: memberTypeId, name: 'Student' }]);

    const result = await controller.list(mockRequest);
    expect(memberTypesService.list).toHaveBeenCalledWith(tenantId);
    expect(result).toHaveLength(1);
  });

  it('delegates getById to service', async () => {
    memberTypesService.getById.mockResolvedValue({ id: memberTypeId, name: 'Student', policies: [] });

    const result = await controller.getById({ memberTypeId }, mockRequest);
    expect(memberTypesService.getById).toHaveBeenCalledWith(tenantId, memberTypeId);
    expect(result.id).toBe(memberTypeId);
  });

  it('delegates update to service', async () => {
    const dto = { name: 'Updated' };
    memberTypesService.update.mockResolvedValue({ id: memberTypeId, name: 'Updated' });

    const result = await controller.update({ memberTypeId }, dto, mockRequest);
    expect(memberTypesService.update).toHaveBeenCalledWith(tenantId, userId, memberTypeId, dto);
    expect(result.name).toBe('Updated');
  });

  it('delegates policy operations to service', async () => {
    const policyDto = {
      itemFormat: 'BOOK',
      loanDurationDays: 14,
      maxConcurrentLoans: 5,
      maxRenewals: 2,
      gracePeriodDays: 0,
      dailyFineMinorUnits: 0,
      maxFineMinorUnits: 0,
    };
    memberTypesService.createPolicy.mockResolvedValue({ id: policyId, ...policyDto });
    memberTypesService.updatePolicy.mockResolvedValue({ id: policyId, loanDurationDays: 21 });
    memberTypesService.deletePolicy.mockResolvedValue({ deleted: true });

    await controller.createPolicy({ memberTypeId }, policyDto, mockRequest);
    expect(memberTypesService.createPolicy).toHaveBeenCalledWith(
      tenantId,
      userId,
      memberTypeId,
      policyDto,
    );

    await controller.updatePolicy(
      { memberTypeId, policyId },
      { loanDurationDays: 21 },
      mockRequest,
    );
    expect(memberTypesService.updatePolicy).toHaveBeenCalledWith(
      tenantId,
      userId,
      memberTypeId,
      policyId,
      { loanDurationDays: 21 },
    );

    await controller.deletePolicy({ memberTypeId, policyId }, mockRequest);
    expect(memberTypesService.deletePolicy).toHaveBeenCalledWith(
      tenantId,
      userId,
      memberTypeId,
      policyId,
    );
  });
});
