using System.ComponentModel.DataAnnotations.Schema;

namespace DataModeler.API.Models;

[Table("workflow_templates")]
public class WorkflowTemplate
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("stages_json")]
    public string StagesJson { get; set; } = "[]";

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
