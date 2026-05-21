using DataModeler.API.DTOs;

namespace DataModeler.API.Services;

public interface IReverseEngineeringService
{
    Task<List<ReverseEngineTableDto>> GetTablesAsync(ReverseEngineGetTablesRequestDto request, CancellationToken cancellationToken = default);
    Task<ReverseEngineGenerateDbmlResponseDto> GenerateDbmlAsync(ReverseEngineGenerateDbmlRequestDto request, CancellationToken cancellationToken = default);
}
