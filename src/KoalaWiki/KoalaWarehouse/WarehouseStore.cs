using System.Threading.Channels;

namespace KoalaWiki.KoalaWarehouse;

public class WarehouseStore
{

    private readonly Channel<Entities.Warehouse> _warehouseChannel =
        Channel.CreateBounded<Entities.Warehouse>(new BoundedChannelOptions(10000)
        {
            FullMode = BoundedChannelFullMode.Wait // 当通道满时，写入操作会等待
        });

    /// <summary>
    /// 向仓库通道中写入一个仓库实体
    /// </summary>
    /// <param name="warehouse">要写入的仓库实体</param>
    /// <param name="cancellationToken">取消操作的令牌</param>
    /// <returns>写入是否成功的任务</returns>
    public async Task<bool> WriteAsync(Entities.Warehouse warehouse, CancellationToken cancellationToken = default)
    {
        if (warehouse == null)
        {
            return false;
        }

        try
        {
            await _warehouseChannel.Writer.WriteAsync(warehouse, cancellationToken);
            return true;
        }
        catch (OperationCanceledException)
        {
            return false;
        }
        catch (ChannelClosedException)
        {
            return false;
        }
    }

    /// <summary>
    /// 从仓库通道中读取一个仓库实体
    /// </summary>
    /// <param name="cancellationToken">取消操作的令牌</param>
    /// <returns>读取到的仓库实体，如果没有数据则返回null</returns>
    public async Task<Entities.Warehouse?> ReadAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _warehouseChannel.Reader.ReadAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            return null;
        }
        catch (ChannelClosedException)
        {
            return null;
        }
    }
}