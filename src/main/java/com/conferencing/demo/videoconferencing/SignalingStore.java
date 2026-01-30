package com.conferencing.demo.videoconferencing;

import org.springframework.stereotype.Component;

import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

@Component
public class SignalingStore {

    // SDP
    public volatile Object offer;
    public volatile Object answer;

    // ICE candidates
    public final Queue<Object> iceCandidates = new ConcurrentLinkedQueue<>();

    public void reset() {
        offer = null;
        answer = null;
        iceCandidates.clear();
    }
}

