using DataModeler.API.DTOs;

namespace DataModeler.API.Services
{
    public interface IDbmlParserService
    {
        ErdDataDto ParseDbmlToErd(string dbmlContent);
        string GenerateDbmlFromNodes(List<DbmlTableNodeDto> nodes, List<DbmlRelationshipDto> relationships);
    }
}
