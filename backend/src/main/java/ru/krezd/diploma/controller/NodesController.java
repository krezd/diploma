package ru.krezd.diploma.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import ru.krezd.diploma.dto.slurm.SlurmOpenapiResponse;
import ru.krezd.diploma.dto.slurm.node.SlurmNodesResponseDTO;
import ru.krezd.diploma.dto.slurm.node.SlurmUpdateNodeRequestDTO;
import ru.krezd.diploma.service.NodesService;

/**
 * Контроллер для управления узлами SLURM.
 *
 * <p>Разграничение ролей:
 * <ul>
 *   <li>Любой авторизованный — просмотр узлов и их состояния</li>
 *   <li>ADMIN — изменение состояния и удаление узлов</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/slurm")
@RequiredArgsConstructor
public class    NodesController {

    private final NodesService nodesService;

    // ── Чтение ────────────────────────────────────────────────────────────────

    /**
     * Возвращает список всех узлов кластера с их состоянием и характеристиками.
     */
    @GetMapping("/nodes")
    public ResponseEntity<SlurmNodesResponseDTO> getNodes(
            @RequestParam(required = false) Long updateTime,
            @RequestParam(required = false) String flags) {

        return ResponseEntity.ok(nodesService.getNodes(updateTime, flags));
    }

    /**
     * Возвращает подробную информацию об одном узле.
     */
    @GetMapping("/node/{nodeName}")
    public ResponseEntity<SlurmNodesResponseDTO> getNode(
            @PathVariable String nodeName,
            @RequestParam(required = false) Long updateTime,
            @RequestParam(required = false) String flags) {

        return ResponseEntity.ok(nodesService.getNodeByName(nodeName, updateTime, flags));
    }

    // ── Управление (только ADMIN) ─────────────────────────────────────────────

    /**
     * Обновляет состояние узла.
     * Позволяет перевести узел в DRAIN, UNDRAIN, DOWN, RESUME и т.д.
     * Только для администраторов.
     *
     * @param nodeName имя узла
     * @param request  новое состояние и причина изменения
     */
    @PostMapping("/node/{nodeName}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SlurmOpenapiResponse> updateNode(
            @PathVariable String nodeName,
            @RequestBody SlurmUpdateNodeRequestDTO request, @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(nodesService.updateNode(nodeName, request, userDetails.getUsername()));
    }

    /**
     * Удаляет узел из конфигурации SLURM.
     * Только для администраторов.
     *
     * @param nodeName имя узла для удаления
     */
    @DeleteMapping("/node/{nodeName}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteNode(@PathVariable String nodeName) {
        return nodesService.deleteNode(nodeName);
    }
}