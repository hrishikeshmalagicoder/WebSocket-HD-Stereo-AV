package com.conferencing.demo.videoconferencing;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/signal")
@CrossOrigin
public class SignalingController {

    private final SignalingStore store;

    public SignalingController(SignalingStore store) {
        this.store = store;
    }

    /* ---------- OFFER ---------- */

    @PostMapping("/offer")
    public ResponseEntity<Void> saveOffer(@RequestBody Object offer) {
        store.offer = offer;
        return ResponseEntity.ok().build();
    }

    @GetMapping("/offer")
    public ResponseEntity<Object> getOffer() {
        if (store.offer == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(store.offer);
    }

    /* ---------- ANSWER ---------- */

    @PostMapping("/answer")
    public ResponseEntity<Void> saveAnswer(@RequestBody Object answer) {
        store.answer = answer;
        return ResponseEntity.ok().build();
    }

    @GetMapping("/answer")
    public ResponseEntity<Object> getAnswer() {
        if (store.answer == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(store.answer);
    }

    /* ---------- ICE ---------- */

    @PostMapping("/ice")
    public ResponseEntity<Void> saveIce(@RequestBody Object iceCandidate) {
        store.iceCandidates.add(iceCandidate);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/ice")
    public ResponseEntity<List<Object>> getIce() {
        List<Object> list = new ArrayList<>();
        while (!store.iceCandidates.isEmpty()) {
            list.add(store.iceCandidates.poll());
        }
        return ResponseEntity.ok(list);
    }

    /* ---------- RESET (for local testing) ---------- */

    @PostMapping("/reset")
    public ResponseEntity<Void> reset() {
        store.reset();
        return ResponseEntity.ok().build();
    }
}

