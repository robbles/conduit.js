#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
xbee_interface.py

Communicates with an XBee Series 2.5 module in API mode thorough a serial port.

Copyright (c) 2009-2011 Rob O'Dwyer. All rights reserved.
"""

# Import and init an XBee device
from xbee import ZigBee
from serial import Serial, SerialException
import select
import os, sys
import fcntl
import json
from glob import glob

# log to stderr
import logging
logging.basicConfig(format='%(name)s - %(levelname)s - %(message)s',
                    stream=sys.stderr)
log = logging.getLogger('xbee_interface')


class XBeeInterface(object):
    """
    Interfaces between an XBee connected through a serial port and messages
    passed through stdin/stdout. Uses a simple JSON protocol to encode message
    parameters.
    """
    def __init__(self, port, baud, escaped):

        self.serial_port = Serial(port, baud)
        self.xbee = ZigBee(self.serial_port, escaped=escaped)

        # Reopen stdin/stdout in line-buffered mode
        self.stdin = os.fdopen(sys.stdin.fileno(), 'r', 1)
        self.stdout = os.fdopen(sys.stdout.fileno(), 'w', 1)

        # Associate each file descriptor with handler methods
        self.handlers = {
            self.serial_port.fileno(): (self.read_frame, self.on_frame),
            self.stdin.fileno(): (self.read_message, self.on_message)
        }

        # Turn on non-blocking IO
        for fd in self.handlers.keys():
            fcntl.fcntl(fd, fcntl.F_SETFL, os.O_NONBLOCK)

    def run(self):
        # Send an AT command to trigger a response from the module
        self.xbee.at(command='NI')
        response = self.xbee.wait_read_frame()
        log.info('Network identifier is "%s"', response['parameter'])

        while True:
            # do non-blocking reading from stdin and serial port
            r, w, x = select.select(self.handlers.keys(), [], [])

            for fd in r:
                read_handler, data_handler = self.handlers[fd]
                data = read_handler()

                # read handlers return None if message is gimped
                if data is not None:
                    data_handler(data)


    def read_frame(self):
        """ Read an entire frame from the serial connection and return it """
        try:
            return self.xbee.wait_read_frame()
        except ValueError as e:
            log.warning('error in packet data: %s', e)
            return None
        except SerialException as e:
            log.error('error reading serial frame: %s', e)
            raise IOError("Error reading from serial port")

    def read_message(self):
        """ Read a line from stdin and parse it as JSON """
        try:
            line = self.stdin.readline()
            return json.loads(line)
        except ValueError as e:
            log.error('error decoding message: %s', e)
            return None

    def json_message(self, data):
        """ Write a JSON string to stdout, using latin1 encoding to keep binary
        data intact """
        json_str = json.dumps(data, encoding='latin1')
        self.stdout.write(json_str + '\n')

    def on_message(self, message):
        log.info('Message received from stdin: %s', message)

        try:
            # delegate to another method specified by action
            action = '_'.join(('do', message['action']))
            if not hasattr(self, action):
                return log.error('Unknown action "%s"', message['action'])
            getattr(self, action)(message)
        except KeyError as e:
            return log.error('Message is missing "%s"', e.message)


    def do_send(self, message):
        """ Sends a transmit request to the module """
        # encode as latin1 to get back byte string
        address, data, frame_id = (
                message['address'].encode('latin1'),
                message['data'].encode('latin1'), 
                message.get('frame_id', u'\x01').encode('latin1'))

        try:
            self.xbee.tx(data=data, frame_id=frame_id,
                    dest_addr_long=address, dest_addr='\xFF\xFE')
        except Exception as e:
            return log.error('Failed to send transmit request: %s', e)


    def do_discover(self, message):
        frame_id = message.get('frame_id', u'\x01').encode('latin1')
        self.xbee.at(command='ND', frame_id=frame_id)
            

    def on_frame(self, frame):
        log.debug('Frame received from device: %s', frame)
        try:
            event = '_'.join(('on_frame', frame['id']))
            getattr(self, event)(frame)
        except (AttributeError, KeyError):
            log.warning('unhandled frame: %s', frame)

    def on_frame_rx(self, frame):
        log.info('Received message from %s/%s', hexify(frame['source_addr_long']),
                hexify(frame['source_addr']))
        self.json_message(frame)

    def on_frame_tx_status(self, frame):
        log.info('Transmit status for frame %s: %s', frame['frame_id'],
                'success' if frame['deliver_status'] == '\x00' else 'failure')
        self.json_message(frame)

    def on_frame_at_response(self, frame):
        log.info('AT response for frame %s: "%s"', 
                frame['frame_id'], frame['parameter'])
        self.json_message(frame)


def hexify(s):
    """ Turns a binary string into a string of the corresponding hex bytes """
    return ''.join(('%02X' % ord(c) for c in s))


def main(env):
    port = env.get('PORT')
    baud = int(env.get('BAUD', 9600))
    escaped = env.get('ESCAPE', 'true') in ('true', 'yes', '1')
    log.setLevel(getattr(logging, env.get('LOGGING', 'DEBUG')))

    if not port:
        log.error('PORT environment variable is not set!')
        exit()

    # Expand port filename to allow auto-detection
    try:
        port = glob(port)[0]
    except:
        log.error('Serial port not found: %s', port)
        exit()

    interface = XBeeInterface(port, baud, escaped)
    log.info('XBee interface started on port "%s"' % port)

    # Make sure port is closed if interface crashes
    import atexit
    def shutdown():
        log.debug('shutting down, closing serial port')
        interface.serial_port.close()
    atexit.register(shutdown)

    # Start monitoring stdin and serial
    interface.run()


if __name__ == '__main__':
    main(os.environ)

