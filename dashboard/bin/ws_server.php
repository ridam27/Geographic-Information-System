<?php

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

require __DIR__ . '/../vendor/autoload.php';

use App\Config;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\Server\IoServer;
use React\EventLoop\Loop;
use React\Socket\SocketServer;
use Clue\React\Redis\Factory as RedisFactory;

// Holds every connected dashboard browser and re-sends whatever
// arrives from the Redis GPS channel to all of them.
class GpsBroadcaster implements MessageComponentInterface
{
    private \SplObjectStorage $clients;

    public function __construct()
    {
        $this->clients = new \SplObjectStorage();
    }

    public function onOpen(ConnectionInterface $conn): void
    {
        $this->clients->attach($conn);
    }

    public function onMessage(ConnectionInterface $from, $msg): void
    {
        // Dashboard clients are receive-only; nothing to do with inbound messages.
    }

    public function onClose(ConnectionInterface $conn): void
    {
        $this->clients->detach($conn);
    }

    public function onError(ConnectionInterface $conn, \Exception $e): void
    {
        $conn->close();
    }

    public function broadcast(string $payload): void
    {
        foreach ($this->clients as $client) {
            $client->send($payload);
        }
    }
}

$listenHost   = Config::get('WS_LISTEN_HOST', '0.0.0.0');
$listenPort   = Config::get('WS_LISTEN_PORT', '8090');
$redisUri     = Config::get('REDIS_URI', 'redis://127.0.0.1:6379');
$redisChannel = Config::get('REDIS_GPS_CHANNEL', 'gps_updates');

$loop        = Loop::get();
$broadcaster = new GpsBroadcaster();

// Async Redis client (clue/redis-react) so a blocking SUBSCRIBE call
// never stalls the same event loop that serves WebSocket connections.
$redisFactory = new RedisFactory($loop);

function connectRedis($redisFactory, $redisUri, $redisChannel, $broadcaster, $loop)
{
    $redisFactory->createClient($redisUri)->then(
        function ($client) use ($broadcaster, $redisChannel, $loop, $redisFactory, $redisUri) {
            echo "✅ Connected & subscribed to Redis channel '{$redisChannel}'\n";
            $client->subscribe($redisChannel);
            $client->on('message', function ($channel, $payload) use ($broadcaster) {
                $broadcaster->broadcast($payload);
            });
            $client->on('close', function () use ($loop, $redisFactory, $redisUri, $redisChannel, $broadcaster) {
                echo "⚠️ Redis connection closed. Retrying in 5 seconds...\n";
                $loop->addTimer(5, function () use ($redisFactory, $redisUri, $redisChannel, $broadcaster, $loop) {
                    connectRedis($redisFactory, $redisUri, $redisChannel, $broadcaster, $loop);
                });
            });
        },
        function (\Exception $e) use ($loop, $redisFactory, $redisUri, $redisChannel, $broadcaster) {
            fwrite(STDERR, "⚠️ Redis connection failed: {$e->getMessage()}. Retrying in 5s...\n");
            $loop->addTimer(5, function () use ($redisFactory, $redisUri, $redisChannel, $broadcaster, $loop) {
                connectRedis($redisFactory, $redisUri, $redisChannel, $broadcaster, $loop);
            });
        }
    );
}

connectRedis($redisFactory, $redisUri, $redisChannel, $broadcaster, $loop);

$socket = new SocketServer("{$listenHost}:{$listenPort}", [], $loop);
$server = new IoServer(new HttpServer(new WsServer($broadcaster)), $socket, $loop);

echo "WebSocket GPS relay listening on ws://{$listenHost}:{$listenPort}\n";

$server->run();
