namespace KoalaWiki.Entities;

public class Entity<TKey> : IEntity<TKey>, ICreateEntity
{
    public TKey Id { get; set; }

    public DateTime CreatedAt { get; set; }
}