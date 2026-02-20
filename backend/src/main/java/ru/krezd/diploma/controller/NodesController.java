package ru.krezd.diploma.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.krezd.diploma.dto.slurm.node.SlurmNodesResponseDTO;
import ru.krezd.diploma.service.NodesService;

@RestController
@RequestMapping("/api/slurm")
@RequiredArgsConstructor
public class NodesController {

    @Autowired
    private NodesService nodesService;

    @GetMapping("/nodes")
    public ResponseEntity<SlurmNodesResponseDTO> getNodes(
            @RequestParam(required = false) Long updateTime,
            @RequestParam(required = false) String flags) {

        return ResponseEntity.ok(nodesService.getNodes(updateTime, flags));
    }

    @GetMapping("/node/{nodeName}")
    public ResponseEntity<SlurmNodesResponseDTO> getNode(
            @PathVariable String nodeName,
            @RequestParam(required = false) Long updateTime,
            @RequestParam(required = false) String flags
    ) {
        return ResponseEntity.ok(
                nodesService.getNodeByName(nodeName, updateTime, flags)
        );
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/node/{nodeName}")
    public ResponseEntity<?> deleteNode(
            @PathVariable String nodeName
    ) {
        return nodesService.deleteNode(nodeName);
    }

}
