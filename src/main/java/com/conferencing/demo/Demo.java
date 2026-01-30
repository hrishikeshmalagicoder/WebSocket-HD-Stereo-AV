package com.conferencing.demo;

import javax.sound.sampled.*;
import java.io.*;

public class Demo {

    private static final int RECORD_TIME_MS = 10_0000; // 10 seconds
    private static final File OUTPUT_FILE = new File("recording.wav");

    public static void main(String[] args) throws Exception {

        AudioFormat format = new AudioFormat(
                44100,
                16,
                1,
                true,
                false
        );

        DataLine.Info info = new DataLine.Info(TargetDataLine.class, format);
        TargetDataLine microphone = (TargetDataLine) AudioSystem.getLine(info);

        microphone.open(format);
        microphone.start();

        System.out.println("🎙 Recording started...");

        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] data = new byte[4096];

        long endTime = System.currentTimeMillis() + RECORD_TIME_MS;

        while (System.currentTimeMillis() < endTime) {
            int bytesRead = microphone.read(data, 0, data.length);
            buffer.write(data, 0, bytesRead);
        }

        microphone.stop();
        microphone.close();

        System.out.println("🛑 Recording stopped.");

        byte[] audioData = buffer.toByteArray();
        ByteArrayInputStream bais = new ByteArrayInputStream(audioData);

        AudioInputStream audioStream =
                new AudioInputStream(bais, format, audioData.length / format.getFrameSize());

        AudioSystem.write(audioStream, AudioFileFormat.Type.WAVE, OUTPUT_FILE);

        System.out.println("✅ Saved to " + OUTPUT_FILE.getAbsolutePath());
    }
}

