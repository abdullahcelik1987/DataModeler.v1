using DataModeler.API.DTOs;

namespace DataModeler.API.Services;

public interface IChangeRequestService
{
    Task<ChangeRequestDetailDto> CreateAsync(Guid requesterId, CreateChangeRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> CanReadRequestAsync(Guid requestId, Guid actorUserId, CancellationToken cancellationToken = default);
    Task<List<ChangeRequestListItemDto>> GetFilteredRequestsAsync(Guid actorUserId, ChangeRequestFilterDto filter, CancellationToken cancellationToken = default);
    Task<List<ChangeRequestListItemDto>> GetMyRequestsAsync(Guid requesterId, CancellationToken cancellationToken = default);
    Task<List<ChangeRequestListItemDto>> GetPendingApprovalsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<ChangeRequestDetailDto?> GetByIdAsync(Guid requestId, Guid? actorUserId = null, CancellationToken cancellationToken = default);
    Task<ChangeRequestDetailDto?> ApproveAsync(Guid requestId, Guid actorUserId, string? comment, CancellationToken cancellationToken = default);
    Task<ChangeRequestDetailDto?> RejectAsync(Guid requestId, Guid actorUserId, string? comment, CancellationToken cancellationToken = default);
    Task<ChangeRequestDetailDto?> SubmitAsync(Guid requestId, Guid actorUserId, string? comment, CancellationToken cancellationToken = default);
    Task<ChangeRequestDetailDto?> MarkMergedAsync(Guid requestId, Guid actorUserId, string? comment, CancellationToken cancellationToken = default);
    Task<bool> DeleteAndRollbackAsync(Guid requestId, Guid actorUserId, CancellationToken cancellationToken = default);
}
