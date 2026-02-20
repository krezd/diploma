package ru.krezd.diploma.dto.slurm.node;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.SlurmUint32;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmUpdateNodeRequestDTO {

    /**
     * Arbitrary comment.
     */
    private String comment;

    /**
     * Default CPU binding type.
     */
    private Integer cpuBind;

    /**
     * Arbitrary string.
     */
    private String extra;

    /**
     * New available features for node.
     */
    private List<String> features;

    /**
     * New active features for node.
     */
    private List<String> featuresAct;

    /**
     * New generic resources for node.
     */
    private String gres;

    /**
     * Communication name (hostlist).
     */
    private List<String> address;

    /**
     * Node hostname (hostlist).
     */
    private List<String> hostname;

    /**
     * Node(s) to update (hostlist).
     */
    private List<String> name;

    /**
     * New node state.
     */
    private List<SlurmNodeState> state;

    /**
     * Reason for node being DOWN or DRAINING.
     */
    private String reason;

    /**
     * User ID of sender (if root is sending message).
     */
    private String reasonUid;

    /**
     * Automatically resume node after this many seconds.
     */
    private SlurmUint32 resumeAfter;

    /**
     * New weight for node.
     */
    private SlurmUint32 weight;
}
