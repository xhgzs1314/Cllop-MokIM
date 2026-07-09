<?php

class NestedAuthSDK
{
    private $masterKey;
    private $timeWindow = 2;

    public function __construct($masterKey)
    {
        $this->masterKey = $masterKey;
    }

    private static function lcg(&$state)
    {
        $state = ($state * 1103515245 + 12345) & 0x7fffffff;
        return $state / 0x7fffffff;
    }

    private static function encodeKeyWithQuantile($key, $quantile)
    {
        $digits = array_map('intval', str_split($key));
        $strategies = [
            fn($arr) => $arr,
            fn($arr) => array_reverse($arr),
            function($arr) {
                $copy = $arr;
                $temp = $copy[0];
                $copy[0] = $copy[count($copy)-1];
                $copy[count($copy)-1] = $temp;
                return $copy;
            },
            function($arr) {
                $copy = $arr;
                $first = array_shift($copy);
                array_push($copy, $first);
                return $copy;
            },
            function($arr) {
                $copy = $arr;
                $last = array_pop($copy);
                array_unshift($copy, $last);
                return $copy;
            },
            function($arr) {
                $copy = $arr;
                for ($i = 0; $i < count($copy)-1; $i += 2) {
                    $temp = $copy[$i];
                    $copy[$i] = $copy[$i+1];
                    $copy[$i+1] = $temp;
                }
                return $copy;
            }
        ];
        $result = $strategies[$quantile % count($strategies)]($digits);
        return implode('', $result);
    }

    private static function groupTimestampWithKey($keyParam, $timestampMs)
    {
        $seconds = floor($timestampMs / 1000);
        $ms = $timestampMs % 1000;
        $date = new DateTime('@' . $seconds);
        $date->setTimezone(new DateTimeZone('UTC'));
        $minutes = (int)$date->format('i');
        $secs = (int)$date->format('s');

        $keySeed = array_sum(array_map('intval', str_split($keyParam)));
        $rngState = ($minutes * 1000 + $secs + $ms + $keySeed) % 2147483647;

        $tsDigits = array_map('intval', str_split($timestampMs));
        for ($i = count($tsDigits)-1; $i > 0; $i--) {
            $rand = self::lcg($rngState);
            $j = (int)floor($rand * ($i + 1));
            $temp = $tsDigits[$i];
            $tsDigits[$i] = $tsDigits[$j];
            $tsDigits[$j] = $temp;
        }

        $pairs = [];
        for ($i = 0; $i < count($tsDigits)-1; $i += 2) {
            $pairs[] = [$tsDigits[$i], $tsDigits[$i+1]];
        }
        if (count($tsDigits) % 2 === 1) {
            $pairs[] = [$tsDigits[count($tsDigits)-1], (int)floor(self::lcg($rngState) * 10)];
        }

        $keyDigits = array_map('intval', str_split($keyParam));
        for ($i = 0; $i < count($pairs) && $i < count($keyDigits); $i++) {
            $pairs[$i][0] = ($pairs[$i][0] + $keyDigits[$i]) % 10;
            if (isset($pairs[$i][1])) {
                $pairs[$i][1] = ($pairs[$i][1] + $keyDigits[($i+1) % count($keyDigits)]) % 10;
            }
        }

        $quantile = (int)floor($minutes / 10);
        $transforms = [
            fn($arr) => $arr,
            fn($arr) => array_reverse($arr),
            function($arr) {
                $mid = (int)floor(count($arr)/2);
                return array_merge(array_slice($arr, $mid), array_slice($arr, 0, $mid));
            },
            fn($arr) => array_map(fn($p) => [$p[1], $p[0]], $arr),
            fn($arr) => array_values(array_filter($arr, fn($_, $i) => $i % 2 === 0, ARRAY_FILTER_USE_BOTH)),
            function($arr) use (&$rngState) {
                $shuffled = $arr;
                for ($i = count($shuffled)-1; $i > 0; $i--) {
                    $rand = self::lcg($rngState);
                    $j = (int)floor($rand * ($i + 1));
                    $temp = $shuffled[$i];
                    $shuffled[$i] = $shuffled[$j];
                    $shuffled[$j] = $temp;
                }
                return $shuffled;
            }
        ];

        $result = $transforms[$quantile % count($transforms)]($pairs);
        $flat = [];
        foreach ($result as $item) {
            if (is_array($item)) $flat = array_merge($flat, $item);
            else $flat[] = $item;
        }
        return implode('', $flat);
    }

    public function generateSignature($timestampMs = null)
    {
        $ts = $timestampMs ?? $this->getServerTime();
        $minutes = (int)(new DateTime('@' . floor($ts/1000)))->setTimezone(new DateTimeZone('UTC'))->format('i');
        $encodedKey = self::encodeKeyWithQuantile($this->masterKey, (int)floor($minutes/10));
        return substr(self::groupTimestampWithKey($encodedKey, $ts), 0, 12);
    }

    public function verifySignature($clientToken, $clientTimestamp)
    {
        $ts = (int)$clientTimestamp;
        if ($ts <= 0) return false;
        for ($delta = -$this->timeWindow; $delta <= $this->timeWindow; $delta++) {
            $testTime = $ts + $delta * 60000;
            if ($clientToken === $this->generateSignature($testTime)) {
                return true;
            }
        }
        return false;
    }

    public function setTimeWindow($minutes)
    {
        $this->timeWindow = $minutes;
        return $this;
    }

    public function getServerTime()
    {
        return (int)(microtime(true) * 1000);
    }
}