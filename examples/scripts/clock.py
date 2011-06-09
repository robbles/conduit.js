#!/usr/bin/env python

from __future__ import print_function
from datetime import datetime
from struct import pack
from time import sleep
from sys import stdout, stderr
import os

sleep_time = int(os.environ.get('SLEEP_TIME', 10))

# Turn off stdout buffering
stdout = os.fdopen(stdout.fileno(), 'w', 0)

print('clock controller: syncing every %d seconds' % sleep_time, file=stderr)

while True:
    now = datetime.now()

    # convert to 12-hour
    hour = 12 if ((now.hour % 12) == 0) else (now.hour % 12)
    minute, second, pm = now.minute, now.second, (now.hour > 11)

    time_msg = ('[', pack('>BBBB', hour, minute, second, pm), '%]')
    print(*time_msg, sep='', file=stdout)

    sleep(sleep_time)

